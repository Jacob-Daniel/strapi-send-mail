export default () => ({
  type: 'content-api',
  routes: [
    {
      method: 'GET',
      path: '/',
      handler: 'controller.index',
      config: {
        policies: [],
      },
    },
    {
      method: 'GET',
      path: '/unsubscribe',
      handler: 'controller.unsubscribe',
      config: {
        auth: false,
        policies: [],
      },
    },
  ],
});
