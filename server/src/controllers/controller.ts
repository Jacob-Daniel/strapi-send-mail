import type { Core } from '@strapi/strapi';

const controller = ({ strapi }: { strapi: Core.Strapi }) => ({
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
      await strapi.plugin('send-mail').service('service').unsubscribe(token);
      ctx.status = 200;
      ctx.body = { message: 'Unsubscribed successfully' };
    } catch (err) {
      ctx.status = 400;
      ctx.body = { error: { message: err.message ?? 'Unsubscribe failed' } };
    }
  },
});

export default controller;
