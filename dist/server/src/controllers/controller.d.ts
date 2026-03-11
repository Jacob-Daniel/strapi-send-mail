import type { Core } from '@strapi/strapi';
declare const controller: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    getGroups(ctx: any): Promise<void>;
    getTemplates(ctx: any): Promise<void>;
    send(ctx: any): Promise<void>;
};
export default controller;
