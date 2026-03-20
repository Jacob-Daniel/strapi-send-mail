import type { Core } from '@strapi/strapi';
import renderBlocksToHtml from './renderHtml';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PluginSettings {
  /** e.g. "api::user.user" or "api::subscriber.subscriber" */
  collection: string;
  /** Field on that collection that holds the email address */
  emailField: string;
  /** Field that holds the subscription status (optional) */
  statusField: string;
  /** Value of statusField that means "active / should receive mail" */
  activeValue: string;
  /** Field that holds the unsubscribe token (optional — plugin can manage its own) */
  tokenField: string;
}

const DEFAULT_SETTINGS: PluginSettings = {
  collection: 'api::subscriber.subscriber',
  emailField: 'email',
  statusField: 'subscribedStatus',
  activeValue: 'active',
  tokenField: 'unsubscribeToken',
};

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

const service = ({ strapi }: { strapi: Core.Strapi }): Record<string, (...args: any[]) => any> => {
  // ── Settings helpers ──────────────────────────────────────────────────────

  async function getSettings(): Promise<PluginSettings> {
    const store = strapi.store({ type: 'plugin', name: 'send-mail' });
    const saved = (await store.get({ key: 'settings' })) as Partial<PluginSettings> | null;
    return { ...DEFAULT_SETTINGS, ...(saved ?? {}) };
  }

  async function saveSettings(settings: Partial<PluginSettings>): Promise<PluginSettings> {
    const current = await getSettings();
    const merged = { ...current, ...settings };
    const store = strapi.store({ type: 'plugin', name: 'send-mail' });
    await store.set({ key: 'settings', value: merged });
    return merged;
  }

  // ── Token management ──────────────────────────────────────────────────────

  async function generateToken(documentId: string): Promise<string> {
    const { randomUUID } = await import('crypto');
    const token = randomUUID();
    const { collection, tokenField } = await getSettings();
    await strapi.documents(collection as any).update({
      documentId,
      data: { [tokenField]: token } as any,
    });
    return token;
  }

  // ── Unsubscribe ───────────────────────────────────────────────────────────

  async function unsubscribe(token: string) {
    const { collection, tokenField, statusField } = await getSettings();

    const results = await strapi.documents(collection as any).findMany({
      filters: { [tokenField]: { $eq: token } } as any,
      populate: ['groups'],
    });

    const subscriber = results[0];
    if (!subscriber) throw new Error('Invalid unsubscribe token');

    if (subscriber[statusField] === 'unsubscribed') {
      strapi.log.info(`[send-mail] Already unsubscribed: ${subscriber.email}`);
      return { alreadyUnsubscribed: true };
    }

    await strapi.documents(collection as any).update({
      documentId: subscriber.documentId,
      data: {
        [statusField]: 'unsubscribed',
        unsubscribedAt: new Date().toISOString(),
        groups: [],
      } as any,
    });

    strapi.log.info(`[send-mail] Unsubscribed: ${subscriber.email}`);
    return { alreadyUnsubscribed: false };
  }

  // ── Groups ────────────────────────────────────────────────────────────────

  async function getGroups() {
    const { collection, emailField, tokenField, statusField, activeValue } = await getSettings();
    const groups = await strapi.documents('api::subscriber-group.subscriber-group').findMany({
      populate: {
        subscribers: {
          filters: { [statusField]: { $eq: activeValue } } as any,
          fields: [emailField, tokenField],
        },
      },
    });
    return groups;
  }

  // ── Templates ─────────────────────────────────────────────────────────────

  async function getTemplates() {
    return strapi.documents('api::email-template.email-template').findMany({
      fields: ['name', 'subject'],
    });
  }

  // ── Collections / field introspection (for admin UI) ─────────────────────

  async function getCollections() {
    const contentTypes = strapi.contentTypes;
    return Object.keys(contentTypes)
      .filter((uid) => uid.startsWith('api::'))
      .map((uid) => ({
        uid,
        displayName: contentTypes[uid]?.info?.displayName ?? uid.split('.').pop() ?? uid,
      }))
      .sort((a, b) => a.displayName.localeCompare(b.displayName));
  }

  async function getCollectionFields(collectionUid: string) {
    const contentType = strapi.contentTypes[collectionUid];
    if (!contentType) throw new Error(`Collection not found: ${collectionUid}`);

    const SCALAR_TYPES = ['string', 'email', 'text', 'enumeration', 'uid'];
    const fields = Object.entries(contentType.attributes)
      .filter(([, attr]: [string, any]) => SCALAR_TYPES.includes(attr.type))
      .map(([name, attr]: [string, any]) => ({
        name,
        type: attr.type,
        enum: attr.enum ?? null,
      }));

    return fields;
  }

  // ── Send ──────────────────────────────────────────────────────────────────

  async function send({ groupId, templateId }: { groupId: string; templateId: string }) {
    const settings = await getSettings();
    const { collection, emailField, tokenField, statusField, activeValue } = settings;

    const template = await strapi
      .documents('api::email-template.email-template')
      .findOne({ documentId: templateId, populate: ['banner'] });

    if (!template) throw new Error(`Template not found: ${templateId}`);
    if (!template.body) throw new Error(`Template body is empty`);

    const bannerUrl = template.banner?.url
      ? `${(process.env.PUBLIC_URL || '').replace(/\/$/, '')}${template.banner.url}`
      : undefined;

    const group = await strapi.documents('api::subscriber-group.subscriber-group').findOne({
      documentId: groupId,
      populate: {
        subscribers: {
          filters: { [statusField]: { $eq: activeValue } } as any,
          fields: [emailField, tokenField, 'documentId'],
        },
      },
    });

    if (!group) throw new Error(`Group not found: ${groupId}`);

    const subscribers = (group.subscribers ?? []) as Array<Record<string, any>>;

    if (subscribers.length === 0) {
      strapi.log.warn(`[send-mail] No active subscribers found in group ${groupId}`);
      return { sent: 0, failed: 0, errors: [] };
    }

    // Ensure every subscriber has an unsubscribe token
    const subscribersWithTokens = await Promise.all(
      subscribers.map(async (subscriber: any) => {
        let token = subscriber[tokenField];
        if (!token) {
          token = await generateToken(subscriber.documentId);
        }
        return { ...subscriber, _token: token, _email: subscriber[emailField] };
      })
    );

    const frontendUrl = (process.env.FRONTEND_URL || '').replace(/\/$/, '');
    const batchSize = 50;
    const delayMs = 1000;
    const results = { sent: 0, failed: 0, errors: [] as string[] };

    for (let i = 0; i < subscribersWithTokens.length; i += batchSize) {
      const batch = subscribersWithTokens.slice(i, i + batchSize);

      await Promise.all(
        batch.map(async (subscriber: any) => {
          try {
            const unsubUrl = `${frontendUrl}/unsubscribe?token=${subscriber._token}`;
            const privacyUrl = `${frontendUrl}/privacy`;
            const renderedHtml = renderBlocksToHtml(
              template.body as any[],
              privacyUrl,
              bannerUrl,
              unsubUrl
            );
            await strapi.plugins['email'].services.email.send({
              to: subscriber._email,
              subject: template.subject,
              html: renderedHtml,
            });
            results.sent++;
          } catch (err) {
            strapi.log.error(`[send-mail] Failed to send to ${subscriber._email}: ${err.message}`);
            results.failed++;
            results.errors.push(subscriber._email);
          }
        })
      );

      if (i + batchSize < subscribersWithTokens.length) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }

    strapi.log.info(`[send-mail] Done. Sent: ${results.sent}, Failed: ${results.failed}`);
    return results;
  }

  // ── Public API ────────────────────────────────────────────────────────────

  return {
    getSettings,
    saveSettings,
    generateToken,
    unsubscribe,
    getGroups,
    getTemplates,
    getCollections,
    getCollectionFields,
    send,
  };
};

export default service;
