import type { Core } from '@strapi/strapi';
import renderBlocksToHtml from './renderHtml';

const service = ({ strapi }: { strapi: Core.Strapi }): Record<string, (...args: any[]) => any> => ({
  async generateToken(documentId: string) {
    const { randomUUID } = await import('crypto');
    const token = randomUUID();
    await strapi.documents('api::subscriber.subscriber').update({
      documentId,
      data: { unsubscribeToken: token } as any,
    });
    return token;
  },

  async unsubscribe(token: string) {
    // Find subscriber by token
    const results = await strapi.documents('api::subscriber.subscriber').findMany({
      filters: { unsubscribeToken: { $eq: token } },
      populate: ['groups'],
    });

    const subscriber = results[0];
    if (!subscriber) throw new Error('Invalid unsubscribe token');

    // Update status and clear groups
    await strapi.documents('api::subscriber.subscriber').update({
      documentId: subscriber.documentId,
      data: {
        subscribedStatus: 'unsubscribed',
        unsubscribedAt: new Date().toISOString(),
        groups: [],
      } as any,
    });

    strapi.log.info(`[send-mail] Unsubscribed: ${subscriber.email}`);
  },

  async getGroups() {
    const groups = await strapi.documents('api::subscriber-group.subscriber-group').findMany({
      fields: ['name'],
    });
    // strapi.log.info(`[send-mail] Groups found: ${JSON.stringify(groups)}`);
    return groups;
  },

  async getTemplates() {
    return strapi.documents('api::email-template.email-template').findMany({
      fields: ['name', 'subject'],
    });
  },

  async send({ groupId, templateId }: { groupId: string; templateId: string }) {
    const template = await strapi
      .documents('api::email-template.email-template')
      .findOne({ documentId: templateId, populate: ['banner'] });

    const bannerUrl = template.banner?.url
      ? `${(process.env.PUBLIC_URL || '').replace(/\/$/, '')}${template.banner.url}`
      : undefined;

    if (!template) throw new Error(`Template not found: ${templateId}`);
    if (!template.body) throw new Error(`Template body is empty`);

    const group = await strapi.documents('api::subscriber-group.subscriber-group').findOne({
      documentId: groupId,
      populate: {
        subscribers: {
          filters: { subscribedStatus: { $eq: 'active' } },
          fields: ['email'],
        },
      },
    });

    if (!group) throw new Error(`Group not found: ${groupId}`);

    const subscribers = (group.subscribers ?? []) as Array<{ email: string }>;

    if (subscribers.length === 0) {
      strapi.log.warn(`[send-mail] No active subscribers found in group ${groupId}`);
      return { sent: 0, failed: 0, errors: [] };
    }

    const subscribersWithTokens = await Promise.all(
      subscribers.map(async (subscriber: any) => {
        let token = subscriber.unsubscribeToken;
        if (!token) {
          token = await strapi
            .plugin('send-mail')
            .service('service')
            .generateToken(subscriber.documentId);
        }
        return { ...subscriber, unsubscribeToken: token };
      })
    );

    const baseUrl = (process.env.PUBLIC_URL || '').replace(/\/$/, '');

    const batchSize = 50;
    const delayMs = 1000;
    const results = { sent: 0, failed: 0, errors: [] as string[] };

    for (let i = 0; i < subscribersWithTokens.length; i += batchSize) {
      const batch = subscribersWithTokens.slice(i, i + batchSize);

      await Promise.all(
        batch.map(async (subscriber: any) => {
          try {
            const unsubUrl = `${baseUrl}/api/send-mail/unsubscribe?token=${subscriber.unsubscribeToken}`;
            const renderedHtml = renderBlocksToHtml(template.body as any[], bannerUrl, unsubUrl);
            await strapi.plugins['email'].services.email.send({
              to: subscriber.email,
              subject: template.subject,
              html: renderedHtml,
            });
            results.sent++;
          } catch (err) {
            strapi.log.error(`[send-mail] Failed to send to ${subscriber.email}: ${err.message}`);
            results.failed++;
            results.errors.push(subscriber.email);
          }
        })
      );

      if (i + batchSize < subscribersWithTokens.length) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }

    strapi.log.info(`[send-mail] Done. Sent: ${results.sent}, Failed: ${results.failed}`);
    return results;
  },
});

export default service;
