"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const renderHtml_1 = __importDefault(require("./renderHtml"));
const service = ({ strapi }) => ({
    async generateToken(documentId) {
        const { randomUUID } = await Promise.resolve().then(() => __importStar(require('crypto')));
        const token = randomUUID();
        await strapi.documents('api::subscriber.subscriber').update({
            documentId,
            data: { unsubscribeToken: token },
        });
        return token;
    },
    async unsubscribe(token) {
        const results = await strapi.documents('api::subscriber.subscriber').findMany({
            filters: { unsubscribeToken: { $eq: token } },
            populate: ['groups'],
        });
        const subscriber = results[0];
        if (!subscriber)
            throw new Error('Invalid unsubscribe token');
        // Already unsubscribed — treat as success, no update needed
        if (subscriber.subscribedStatus === 'unsubscribed') {
            strapi.log.info(`[send-mail] Already unsubscribed: ${subscriber.email}`);
            return { alreadyUnsubscribed: true };
        }
        await strapi.documents('api::subscriber.subscriber').update({
            documentId: subscriber.documentId,
            data: {
                subscribedStatus: 'unsubscribed',
                unsubscribedAt: new Date().toISOString(),
                groups: [],
            },
        });
        strapi.log.info(`[send-mail] Unsubscribed: ${subscriber.email}`);
        return { alreadyUnsubscribed: false };
    },
    async getGroups() {
        const groups = await strapi.documents('api::subscriber-group.subscriber-group').findMany({
            populate: {
                subscribers: {
                    filters: { subscribedStatus: { $eq: 'active' } },
                    fields: ['email', 'unsubscribeToken'],
                },
            },
        });
        // strapi.log.info(`[send-mail] Groups found: ${JSON.stringify(groups)}`);
        return groups;
    },
    async getTemplates() {
        return strapi.documents('api::email-template.email-template').findMany({
            fields: ['name', 'subject'],
        });
    },
    async send({ groupId, templateId }) {
        const template = await strapi
            .documents('api::email-template.email-template')
            .findOne({ documentId: templateId, populate: ['banner'] });
        const bannerUrl = template.banner?.url
            ? `${(process.env.PUBLIC_URL || '').replace(/\/$/, '')}${template.banner.url}`
            : undefined;
        if (!template)
            throw new Error(`Template not found: ${templateId}`);
        if (!template.body)
            throw new Error(`Template body is empty`);
        const group = await strapi.documents('api::subscriber-group.subscriber-group').findOne({
            documentId: groupId,
            populate: {
                subscribers: {
                    filters: { subscribedStatus: { $eq: 'active' } },
                    fields: ['email'],
                },
            },
        });
        if (!group)
            throw new Error(`Group not found: ${groupId}`);
        const subscribers = (group.subscribers ?? []);
        if (subscribers.length === 0) {
            strapi.log.warn(`[send-mail] No active subscribers found in group ${groupId}`);
            return { sent: 0, failed: 0, errors: [] };
        }
        const subscribersWithTokens = await Promise.all(subscribers.map(async (subscriber) => {
            let token = subscriber.unsubscribeToken;
            if (!token) {
                token = await strapi
                    .plugin('send-mail')
                    .service('service')
                    .generateToken(subscriber.documentId);
            }
            return { ...subscriber, unsubscribeToken: token };
        }));
        const frontendUrl = (process.env.FRONTEND_URL || '').replace(/\/$/, '');
        const batchSize = 50;
        const delayMs = 1000;
        const results = { sent: 0, failed: 0, errors: [] };
        for (let i = 0; i < subscribersWithTokens.length; i += batchSize) {
            const batch = subscribersWithTokens.slice(i, i + batchSize);
            await Promise.all(batch.map(async (subscriber) => {
                try {
                    const unsubUrl = `${frontendUrl}/unsubscribe?token=${subscriber.unsubscribeToken}`;
                    const privacyUrl = `${frontendUrl}/privacy`;
                    const renderedHtml = (0, renderHtml_1.default)(template.body, privacyUrl, bannerUrl, unsubUrl);
                    await strapi.plugins['email'].services.email.send({
                        to: subscriber.email,
                        subject: template.subject,
                        html: renderedHtml,
                    });
                    results.sent++;
                }
                catch (err) {
                    strapi.log.error(`[send-mail] Failed to send to ${subscriber.email}: ${err.message}`);
                    results.failed++;
                    results.errors.push(subscriber.email);
                }
            }));
            if (i + batchSize < subscribersWithTokens.length) {
                await new Promise((resolve) => setTimeout(resolve, delayMs));
            }
        }
        strapi.log.info(`[send-mail] Done. Sent: ${results.sent}, Failed: ${results.failed}`);
        return results;
    },
});
exports.default = service;
