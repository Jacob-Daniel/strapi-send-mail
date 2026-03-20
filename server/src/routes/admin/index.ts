export default {
  type: 'admin',
  routes: [
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
    {
      method: 'POST',
      path: '/send',
      handler: 'controller.send',
      config: { policies: [] },
    },
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
    {
      method: 'POST',
      path: '/send',
      handler: 'controller.send',
      config: { policies: [] },
    },
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
