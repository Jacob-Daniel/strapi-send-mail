import type { Core } from '@strapi/strapi';
declare const service: ({ strapi }: {
    strapi: Core.Strapi;
}) => Record<string, (...args: any[]) => any>;
export default service;
