import type { Core } from '@strapi/strapi';
import renderBlocksToHtml from './renderHtml';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PluginSettings {
  collection: string;
  emailField: string;
  statusField: string;
  activeValue: string;
  tokenField: string;
  batchSize: number;
  delayMs: number;
}

const DEFAULT_SETTINGS: PluginSettings = {
  collection: 'api::subscriber.subscriber',
  emailField: 'email',
  statusField: 'subscribedStatus',
  activeValue: 'active',
  tokenField: 'unsubscribeToken',
  batchSize: 50,
  delayMs: 1000,
};

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

const service = ({ strapi }: { strapi: Core.Strapi }): Record<string, (...args: any[]) => any> => {
  // ── Settings ──────────────────────────────────────────────────────────────

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
    const { statusField, activeValue, emailField, tokenField } = await getSettings();
    return strapi.documents('api::subscriber-group.subscriber-group').findMany({
      populate: {
        subscribers: {
          filters: { [statusField]: { $eq: activeValue } } as any,
          fields: [emailField, tokenField],
        },
      },
    });
  }

  // ── Templates ─────────────────────────────────────────────────────────────

  async function getTemplates() {
    return strapi.documents('api::email-template.email-template').findMany({
      fields: ['name', 'subject'],
    });
  }

  // ── Collections / field introspection ────────────────────────────────────

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
    return Object.entries(contentType.attributes)
      .filter(([, attr]: [string, any]) => SCALAR_TYPES.includes(attr.type))
      .map(([name, attr]: [string, any]) => ({
        name,
        type: attr.type,
        enum: attr.enum ?? null,
      }));
  }

  // ── Campaigns ─────────────────────────────────────────────────────────────

  async function getCampaigns() {
    return strapi.documents('api::email-campaign.email-campaign').findMany({
      sort: { createdAt: 'desc' },
    });
  }

  // ── Unsent count for a group — used by Send tab ───────────────────────────

  async function getUnsentByGroup(groupDocumentId: string) {
    const unsent = await strapi.documents('api::email-send-queue.email-send-queue').findMany({
      filters: {
        groupDocumentId: { $eq: groupDocumentId },
        sentAt: { $null: true },
      } as any,
      fields: ['documentId', 'campaignDocumentId'],
    });

    if (unsent.length === 0) return { count: 0, campaignDocumentId: null };

    // Return the campaignDocumentId of the most recent unsent batch
    // (all unsent rows for a group should share the same campaign)
    const campaignDocumentId = unsent[0].campaignDocumentId;
    return { count: unsent.length, campaignDocumentId };
  }

  // ── Enqueue — creates campaign + queue rows, returns immediately ──────────

  async function enqueueCampaign({ groupId, templateId }: { groupId: string; templateId: string }) {
    const settings = await getSettings();
    const { collection, emailField, tokenField, statusField, activeValue } = settings;

    const template = await strapi
      .documents('api::email-template.email-template')
      .findOne({ documentId: templateId, fields: ['name', 'subject'] });
    if (!template) throw new Error(`Template not found: ${templateId}`);

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
      throw new Error('No active subscribers found in this group');
    }

    // Ensure every subscriber has an unsubscribe token
    const subscribersWithTokens = await Promise.all(
      subscribers.map(async (subscriber: any) => {
        let token = subscriber[tokenField];
        if (!token) token = await generateToken(subscriber.documentId);
        return {
          documentId: subscriber.documentId,
          email: subscriber[emailField],
        };
      })
    );

    // Auto-generate campaign name
    const campaignName = `${group.name} — ${template.subject} (${new Date().toLocaleDateString('en-GB')})`;

    // Create campaign record
    const campaign = await strapi.documents('api::email-campaign.email-campaign').create({
      data: {
        name: campaignName,
        status: 'sending',
        templateDocumentId: templateId,
        templateName: template.name ?? template.subject,
        templateSubject: template.subject,
        groupName: group.name,
        groupDocumentId: groupId,
        totalSent: 0,
        totalFailed: 0,
      } as any,
    });

    // Insert one queue row per subscriber
    await Promise.all(
      subscribersWithTokens.map((s) =>
        strapi.documents('api::email-send-queue.email-send-queue').create({
          data: {
            campaignDocumentId: campaign.documentId,
            groupDocumentId: groupId,
            subscriberDocumentId: s.documentId,
            email: s.email,
            attempts: 0,
          } as any,
        })
      )
    );

    strapi.log.info(
      `[send-mail] Campaign "${campaignName}" enqueued — ${subscribersWithTokens.length} recipients`
    );

    return {
      campaignDocumentId: campaign.documentId,
      queued: subscribersWithTokens.length,
    };
  }

  // ── Retry — resets campaign status, worker picks up unsent rows ───────────

  async function retryCampaign(campaignDocumentId: string) {
    const campaign = await strapi
      .documents('api::email-campaign.email-campaign')
      .findOne({ documentId: campaignDocumentId });
    if (!campaign) throw new Error(`Campaign not found: ${campaignDocumentId}`);

    const unsent = await strapi.documents('api::email-send-queue.email-send-queue').findMany({
      filters: {
        campaignDocumentId: { $eq: campaignDocumentId },
        sentAt: { $null: true },
      } as any,
      fields: ['documentId'],
    });

    if (unsent.length === 0) throw new Error('No unsent rows to retry');

    await strapi.documents('api::email-campaign.email-campaign').update({
      documentId: campaignDocumentId,
      data: { status: 'sending' } as any,
    });

    strapi.log.info(
      `[send-mail] Campaign ${campaignDocumentId} queued for retry — ${unsent.length} unsent rows`
    );

    return { queued: unsent.length };
  }

  // ── Process queue — called by bootstrap worker every 5 mins ──────────────

  async function processQueue() {
    const campaigns = await strapi.documents('api::email-campaign.email-campaign').findMany({
      filters: { status: { $eq: 'sending' } } as any,
    });

    if (campaigns.length === 0) return;

    strapi.log.info(`[send-mail] Processing ${campaigns.length} active campaign(s)`);

    for (const campaign of campaigns) {
      await processCampaign(campaign);
    }
  }

  async function processCampaign(campaign: any) {
    const settings = await getSettings();
    const { batchSize, delayMs, tokenField, collection } = settings;

    // Fetch unsent queue rows
    const unsent = await strapi.documents('api::email-send-queue.email-send-queue').findMany({
      filters: {
        campaignDocumentId: { $eq: campaign.documentId },
        sentAt: { $null: true },
      } as any,
      fields: ['documentId', 'email', 'subscriberDocumentId', 'attempts'],
    });

    if (unsent.length === 0) {
      await finaliseCampaign(campaign.documentId);
      return;
    }

    // Fetch template fresh (need body + banner)
    const tpl = await strapi
      .documents('api::email-template.email-template')
      .findOne({ documentId: campaign.templateDocumentId, populate: ['banner'] });

    if (!tpl?.body) {
      strapi.log.error(
        `[send-mail] Campaign ${campaign.documentId} — template body not found, skipping`
      );
      await strapi.documents('api::email-campaign.email-campaign').update({
        documentId: campaign.documentId,
        data: { status: 'failed', error: 'Template body not found' } as any,
      });
      return;
    }

    const frontendUrl = (process.env.FRONTEND_URL || '').replace(/\/$/, '');
    const bannerUrl = tpl.banner?.url
      ? `${(process.env.PUBLIC_URL || '').replace(/\/$/, '')}${tpl.banner.url}`
      : undefined;

    strapi.log.info(
      `[send-mail] Campaign "${campaign.name}": processing ${unsent.length} unsent rows (batch: ${batchSize}, delay: ${delayMs}ms)`
    );

    for (let i = 0; i < unsent.length; i += batchSize) {
      const batch = unsent.slice(i, i + batchSize);

      await Promise.all(
        batch.map(async (row: any) => {
          try {
            const subscriber = await strapi
              .documents(collection as any)
              .findOne({ documentId: row.subscriberDocumentId });

            const token = subscriber?.[tokenField] ?? '';
            const unsubUrl = `${frontendUrl}/unsubscribe?token=${token}`;
            const privacyUrl = `${frontendUrl}/privacy`;

            const renderedHtml = renderBlocksToHtml(
              tpl.body as any[],
              privacyUrl,
              bannerUrl,
              unsubUrl
            );

            await strapi.plugins['email'].services.email.send({
              to: row.email,
              subject: tpl.subject,
              html: renderedHtml,
            });

            await strapi.documents('api::email-send-queue.email-send-queue').update({
              documentId: row.documentId,
              data: {
                sentAt: new Date().toISOString(),
                attempts: (row.attempts ?? 0) + 1,
                error: null,
              } as any,
            });
          } catch (err) {
            strapi.log.error(`[send-mail] Failed to send to ${row.email}: ${err.message}`);
            await strapi.documents('api::email-send-queue.email-send-queue').update({
              documentId: row.documentId,
              data: {
                attempts: (row.attempts ?? 0) + 1,
                error: err.message,
              } as any,
            });
          }
        })
      );

      await updateCampaignTotals(campaign.documentId);

      if (i + batchSize < unsent.length) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }

    await finaliseCampaign(campaign.documentId);
  }

  async function updateCampaignTotals(campaignDocumentId: string) {
    const [sentRows, failedRows] = await Promise.all([
      strapi.documents('api::email-send-queue.email-send-queue').findMany({
        filters: {
          campaignDocumentId: { $eq: campaignDocumentId },
          sentAt: { $notNull: true },
        } as any,
        fields: ['documentId'],
      }),
      strapi.documents('api::email-send-queue.email-send-queue').findMany({
        filters: {
          campaignDocumentId: { $eq: campaignDocumentId },
          sentAt: { $null: true },
          attempts: { $gt: 0 },
        } as any,
        fields: ['documentId'],
      }),
    ]);

    await strapi.documents('api::email-campaign.email-campaign').update({
      documentId: campaignDocumentId,
      data: {
        totalSent: sentRows.length,
        totalFailed: failedRows.length,
      } as any,
    });
  }

  async function finaliseCampaign(campaignDocumentId: string) {
    const remaining = await strapi.documents('api::email-send-queue.email-send-queue').findMany({
      filters: {
        campaignDocumentId: { $eq: campaignDocumentId },
        sentAt: { $null: true },
      } as any,
      fields: ['documentId'],
    });

    await updateCampaignTotals(campaignDocumentId);

    const newStatus = remaining.length === 0 ? 'sent' : 'sending';
    await strapi.documents('api::email-campaign.email-campaign').update({
      documentId: campaignDocumentId,
      data: {
        status: newStatus,
        ...(newStatus === 'sent' ? { sentAt: new Date().toISOString() } : {}),
      } as any,
    });

    if (newStatus === 'sent') {
      strapi.log.info(`[send-mail] Campaign ${campaignDocumentId} completed`);
    }
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
    getCampaigns,
    getUnsentByGroup,
    enqueueCampaign,
    retryCampaign,
    processQueue,
  };
};

export default service;
