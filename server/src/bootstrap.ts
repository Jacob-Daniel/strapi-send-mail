import type { Core } from '@strapi/strapi';

const POLL_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

const bootstrap = ({ strapi }: { strapi: Core.Strapi }) => {
  // Start the background queue worker
  const worker = setInterval(async () => {
    try {
      await strapi.plugin('send-mail').service('service').processQueue();
    } catch (err) {
      strapi.log.error(`[send-mail] Queue worker error: ${err.message}`);
    }
  }, POLL_INTERVAL_MS);

  // Ensure the interval is cleared if Strapi shuts down
  strapi.db?.connection?.on?.('destroy', () => clearInterval(worker));

  strapi.log.info(`[send-mail] Queue worker started — polling every ${POLL_INTERVAL_MS / 1000}s`);
};

export default bootstrap;
