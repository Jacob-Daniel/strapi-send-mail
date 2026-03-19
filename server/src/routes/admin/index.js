"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = {
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
    ],
};
