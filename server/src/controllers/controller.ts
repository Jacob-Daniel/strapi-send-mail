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
});

export default controller;
