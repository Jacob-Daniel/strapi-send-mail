export default {
  type: 'admin',
  routes: [
    // ── Subscribers & templates ───────────────────────────────────────────
    {
      method: 'GET',
      path: '/groups',
      handler: 'controller.getGroups',
      config: { policies: [] },
    },
    {
      method: 'GET',
      path: '/templates',
      handler: 'controller.getTemplates',
      config: { policies: [] },
    },

    // ── Send (enqueue) ────────────────────────────────────────────────────
    {
      method: 'POST',
      path: '/send',
      handler: 'controller.send',
      config: { policies: [] },
    },

    // ── Unsent check ──────────────────────────────────────────────────────
    {
      method: 'GET',
      path: '/groups/:groupId/unsent',
      handler: 'controller.getUnsentByGroup',
      config: { policies: [] },
    },

    // ── Campaigns ─────────────────────────────────────────────────────────
    {
      method: 'GET',
      path: '/campaigns',
      handler: 'controller.getCampaigns',
      config: { policies: [] },
    },
    {
      method: 'POST',
      path: '/campaigns/:campaignId/retry',
      handler: 'controller.retryCampaign',
      config: { policies: [] },
    },

    // ── Settings ──────────────────────────────────────────────────────────
    {
      method: 'GET',
      path: '/settings',
      handler: 'controller.getSettings',
      config: { policies: [] },
    },
    {
      method: 'POST',
      path: '/settings',
      handler: 'controller.saveSettings',
      config: { policies: [] },
    },

    // ── Collection introspection ──────────────────────────────────────────
    {
      method: 'GET',
      path: '/collections',
      handler: 'controller.getCollections',
      config: { policies: [] },
    },
    {
      method: 'GET',
      path: '/collections/:uid/fields',
      handler: 'controller.getCollectionFields',
      config: { policies: [] },
    },
  ],
};
