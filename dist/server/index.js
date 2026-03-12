"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
Object.defineProperties(exports, { __esModule: { value: true }, [Symbol.toStringTag]: { value: "Module" } });
const bootstrap = ({ strapi }) => {
};
const destroy = ({ strapi }) => {
};
const register = ({ strapi }) => {
};
const config = {
  default: {},
  validator() {
  }
};
const contentTypes = {};
const controller = ({ strapi }) => ({
  async getGroups(ctx) {
    ctx.body = await strapi.plugin("send-mail").service("service").getGroups();
  },
  async getTemplates(ctx) {
    ctx.body = await strapi.plugin("send-mail").service("service").getTemplates();
  },
  async send(ctx) {
    const { groupId, templateId } = ctx.request.body;
    ctx.body = await strapi.plugin("send-mail").service("service").send({ groupId, templateId });
  },
  async unsubscribe(ctx) {
    const { token } = ctx.query;
    await strapi.plugin("send-mail").service("service").unsubscribe(token);
    ctx.redirect(`${process.env.FRONTEND_URL}/unsubscribed`);
  }
});
const controllers = {
  controller
};
const middlewares = {};
const policies = {};
const adminAPIRoutes = {
  type: "admin",
  routes: [
    {
      method: "GET",
      path: "/groups",
      handler: "controller.getGroups",
      config: { policies: [] }
    },
    {
      method: "GET",
      path: "/templates",
      handler: "controller.getTemplates",
      config: { policies: [] }
    },
    {
      method: "POST",
      path: "/send",
      handler: "controller.send",
      config: { policies: [] }
    }
  ]
};
const routes = {
  admin: adminAPIRoutes
};
function renderChildren(children) {
  if (!children) return "";
  return children.map((child) => {
    if (child.type === "link") {
      const text = child.children?.[0]?.text || "Link";
      return `<a href="${child.url}" rel="noopener noreferrer">${text}</a>`;
    }
    if (child.type === "text") {
      let text = child.text || "";
      if (child.bold) text = `<b>${text}</b>`;
      if (child.italic) text = `<i>${text}</i>`;
      if (child.underline) text = `<u>${text}</u>`;
      if (child.strikethrough) text = `<s>${text}</s>`;
      if (child.code) text = `<code>${text}</code>`;
      return text;
    }
    return "";
  }).join("");
}
function renderBlocksToHtml(blocks, bannerUrl, unsubscribeUrl) {
  if (!Array.isArray(blocks)) return "";
  let html = "";
  if (bannerUrl) {
    html += `<img src="${bannerUrl}" alt="" style="width:100%; display:block; margin-bottom:24px;" />`;
  }
  if (unsubscribeUrl) {
    html += `
      <p style="margin-top: 32px; font-size: 12px; color: #999; text-align: center; font-family: Arial, sans-serif;">
        Don't want to receive these emails? 
        <a href="${unsubscribeUrl}" style="color: #999;">Unsubscribe</a>
      </p>
    `;
  }
  blocks.forEach((block) => {
    switch (block.type) {
      case "paragraph": {
        html += `<p style="font-family: Arial, sans-serif; margin-bottom: 12px;">`;
        html += renderChildren(block.children);
        html += `</p>`;
        break;
      }
      case "heading": {
        const tag = `h${block.level}`;
        html += `<${tag} style="font-family: Arial, sans-serif; margin-bottom: 8px;">`;
        html += renderChildren(block.children);
        html += `</${tag}>`;
        break;
      }
      case "list": {
        const tag = block.format === "ordered" ? "ol" : "ul";
        html += `<${tag} style="margin-bottom: 12px; padding-left: 20px;">`;
        block.children?.forEach((item) => {
          html += `<li>${renderChildren(item.children)}</li>`;
        });
        html += `</${tag}>`;
        break;
      }
      case "image": {
        const alt = block.image?.alternativeText || "";
        const rawUrl = block.image?.url || "";
        const base = (process.env.STRAPI_UPLOADS_URL || "").replace(/\/$/, "");
        const path = rawUrl.startsWith("/") ? rawUrl : `/${rawUrl}`;
        const url = rawUrl.startsWith("http") ? rawUrl : `${base}${path}`;
        html += `<img src="${url}" alt="${alt}" style="max-width:100%; display:block; margin-bottom:12px;" />`;
        break;
      }
      case "quote": {
        html += `<blockquote style="border-left: 3px solid #ccc; padding-left: 12px; margin-bottom: 12px;">`;
        html += renderChildren(block.children);
        html += `</blockquote>`;
        break;
      }
      case "code": {
        html += `<pre style="background:#f4f4f4; padding:12px; margin-bottom:12px;"><code>`;
        html += renderChildren(block.children);
        html += `</code></pre>`;
        break;
      }
    }
  });
  return html;
}
const service = ({ strapi }) => ({
  async generateToken(documentId) {
    const { randomUUID } = await import("crypto");
    const token = randomUUID();
    await strapi.documents("api::subscriber.subscriber").update({
      documentId,
      data: { unsubscribeToken: token }
    });
    return token;
  },
  async unsubscribe(token) {
    const results = await strapi.documents("api::subscriber.subscriber").findMany({
      filters: { unsubscribeToken: { $eq: token } },
      populate: ["groups"]
    });
    const subscriber = results[0];
    if (!subscriber) throw new Error("Invalid unsubscribe token");
    await strapi.documents("api::subscriber.subscriber").update({
      documentId: subscriber.documentId,
      data: {
        subscribedStatus: "unsubscribed",
        unsubscribedAt: (/* @__PURE__ */ new Date()).toISOString(),
        groups: []
      }
    });
    strapi.log.info(`[send-mail] Unsubscribed: ${subscriber.email}`);
  },
  async getGroups() {
    const groups = await strapi.documents("api::subscriber-group.subscriber-group").findMany({
      fields: ["name"]
    });
    return groups;
  },
  async getTemplates() {
    return strapi.documents("api::email-template.email-template").findMany({
      fields: ["name", "subject"]
    });
  },
  async send({ groupId, templateId }) {
    const template = await strapi.documents("api::email-template.email-template").findOne({ documentId: templateId, populate: ["banner"] });
    const bannerUrl = template.banner?.url ? `${(process.env.PUBLIC_URL || "").replace(/\/$/, "")}${template.banner.url}` : void 0;
    if (!template) throw new Error(`Template not found: ${templateId}`);
    if (!template.body) throw new Error(`Template body is empty`);
    const group = await strapi.documents("api::subscriber-group.subscriber-group").findOne({
      documentId: groupId,
      populate: {
        subscribers: {
          filters: { subscribedStatus: { $eq: "active" } },
          fields: ["email"]
        }
      }
    });
    if (!group) throw new Error(`Group not found: ${groupId}`);
    const subscribers = group.subscribers ?? [];
    if (subscribers.length === 0) {
      strapi.log.warn(`[send-mail] No active subscribers found in group ${groupId}`);
      return { sent: 0, failed: 0, errors: [] };
    }
    const subscribersWithTokens = await Promise.all(
      subscribers.map(async (subscriber) => {
        let token = subscriber.unsubscribeToken;
        if (!token) {
          token = await strapi.plugin("send-mail").service("service").generateToken(subscriber.documentId);
        }
        return { ...subscriber, unsubscribeToken: token };
      })
    );
    const baseUrl = (process.env.PUBLIC_URL || "").replace(/\/$/, "");
    const batchSize = 50;
    const delayMs = 1e3;
    const results = { sent: 0, failed: 0, errors: [] };
    for (let i = 0; i < subscribersWithTokens.length; i += batchSize) {
      const batch = subscribersWithTokens.slice(i, i + batchSize);
      await Promise.all(
        batch.map(async (subscriber) => {
          try {
            const unsubUrl = `${baseUrl}/api/send-mail/unsubscribe?token=${subscriber.unsubscribeToken}`;
            const renderedHtml = renderBlocksToHtml(template.body, bannerUrl, unsubUrl);
            await strapi.plugins["email"].services.email.send({
              to: subscriber.email,
              subject: template.subject,
              html: renderedHtml
            });
            results.sent++;
          } catch (err) {
            strapi.log.error(`[send-mail] Failed to send to ${subscriber.email}: ${err.message}`);
            results.failed++;
            results.errors.push(subscriber.email);
          }
        })
      );
      if (i + batchSize < subscribersWithTokens.length) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
    strapi.log.info(`[send-mail] Done. Sent: ${results.sent}, Failed: ${results.failed}`);
    return results;
  }
});
const services = {
  service
};
const index = {
  register,
  bootstrap,
  destroy,
  config,
  controllers,
  routes,
  services,
  contentTypes,
  policies,
  middlewares
};
exports.default = index;
