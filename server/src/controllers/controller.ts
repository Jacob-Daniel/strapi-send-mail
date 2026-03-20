import type { Core } from '@strapi/strapi';

const controller = ({ strapi }: { strapi: Core.Strapi }) => ({
  // ── Existing ──────────────────────────────────────────────────────────────

  async getGroups(ctx) {
    ctx.body = await strapi.plugin('send-mail').service('service').getGroups();
  },

  async getTemplates(ctx) {
    ctx.body = await strapi.plugin('send-mail').service('service').getTemplates();
  },

  async send(ctx) {
    const { groupId, templateId } = ctx.request.body;
    ctx.body = await strapi.plugin('send-mail').service('service').send({ groupId, templateId });
  },

  async unsubscribe(ctx) {
    const { token } = ctx.query;
    if (!token || typeof token !== 'string') {
      ctx.status = 400;
      ctx.body = { error: { message: 'Missing token' } };
      return;
    }
    try {
      const result = await strapi.plugin('send-mail').service('service').unsubscribe(token);
      ctx.status = 200;
      ctx.body = {
        message: result.alreadyUnsubscribed ? 'Already unsubscribed' : 'Unsubscribed successfully',
        alreadyUnsubscribed: result.alreadyUnsubscribed,
      };
    } catch (err) {
      ctx.status = 400;
      ctx.body = { error: { message: err.message ?? 'Unsubscribe failed' } };
    }
  },

  // ── Settings ──────────────────────────────────────────────────────────────

  async getSettings(ctx) {
    ctx.body = await strapi.plugin('send-mail').service('service').getSettings();
  },

  async saveSettings(ctx) {
    const settings = ctx.request.body;
    if (!settings || typeof settings !== 'object') {
      ctx.status = 400;
      ctx.body = { error: { message: 'Settings body is required' } };
      return;
    }
    ctx.body = await strapi.plugin('send-mail').service('service').saveSettings(settings);
  },

  // ── Collection introspection ──────────────────────────────────────────────

  async getCollections(ctx) {
    ctx.body = await strapi.plugin('send-mail').service('service').getCollections();
  },

  async getCollectionFields(ctx) {
    const { uid } = ctx.params;
    if (!uid) {
      ctx.status = 400;
      ctx.body = { error: { message: 'Collection uid is required' } };
      return;
    }
    ctx.body = await strapi
      .plugin('send-mail')
      .service('service')
      .getCollectionFields(decodeURIComponent(uid));
  },
});

export default controller;
