import type { Core } from '@strapi/strapi';
import service from './service';

const services: Record<string, Core.Service> = {
  service: service as unknown as Core.Service,
};

export default services;
