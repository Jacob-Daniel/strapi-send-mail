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
    await strapi.plugin('send-mail').service('service').unsubscribe(token);
    ctx.redirect(`${process.env.FRONTEND_URL}/unsubscribed`);
  },
});

export default controller;
