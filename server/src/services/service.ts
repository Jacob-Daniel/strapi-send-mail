import type { Core } from '@strapi/strapi';
import renderBlocksToHtml from './renderHtml';

const service = ({ strapi }: { strapi: Core.Strapi }): Record<string, (...args: any[]) => any> => ({
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
    // strapi.log.info(`[send-mail] Sending template ${templateId} to group ${groupId}`);

    const template = await strapi
      .documents('api::email-template.email-template')
      .findOne({ documentId: templateId, populate: ['banner'] });

    const bannerUrl = template.banner?.url
      ? `${(process.env.PUBLIC_URL || '').replace(/\/$/, '')}${template.banner.url}`
      : undefined;

    // strapi.log.info(`[send-mail] Template found: ${JSON.stringify(template?.name)}`);

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

    // strapi.log.info(`[send-mail] Group found: ${group?.name}`);
    // strapi.log.info(`[send-mail] Subscriber count: ${group?.subscribers?.length ?? 0}`);

    if (!group) throw new Error(`Group not found: ${groupId}`);

    const subscribers = (group.subscribers ?? []) as Array<{ email: string }>;

    if (subscribers.length === 0) {
      strapi.log.warn(`[send-mail] No active subscribers found in group ${groupId}`);
      return { sent: 0, failed: 0, errors: [] };
    }

    // strapi.log.info(`[send-mail] bannerUrl: ${bannerUrl}`);
    // strapi.log.info(`[send-mail] template.banner: ${JSON.stringify(template.banner)}`);

    const renderedHtml = renderBlocksToHtml(template.body as any[], bannerUrl);
    const batchSize = 50;
    const delayMs = 1000;
    const results = { sent: 0, failed: 0, errors: [] as string[] };

    // strapi.log.info(`[send-mail] Starting send to ${subscribers.length} subscribers`);

    for (let i = 0; i < subscribers.length; i += batchSize) {
      const batch = subscribers.slice(i, i + batchSize);

      await Promise.all(
        batch.map(async (subscriber) => {
          try {
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

      if (i + batchSize < subscribers.length) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }

    strapi.log.info(`[send-mail] Done. Sent: ${results.sent}, Failed: ${results.failed}`);
    return results;
  },
});

export default service;
