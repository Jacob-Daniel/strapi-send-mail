"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = () => ({
    type: 'content-api',
    routes: [
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
