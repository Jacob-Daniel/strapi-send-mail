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
  // ── Existing ──────────────────────────────────────────────────────────────
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
    if (!token || typeof token !== "string") {
      ctx.status = 400;
      ctx.body = { error: { message: "Missing token" } };
      return;
    }
    try {
      const result = await strapi.plugin("send-mail").service("service").unsubscribe(token);
      ctx.status = 200;
      ctx.body = {
        message: result.alreadyUnsubscribed ? "Already unsubscribed" : "Unsubscribed successfully",
        alreadyUnsubscribed: result.alreadyUnsubscribed
      };
    } catch (err) {
      ctx.status = 400;
      ctx.body = { error: { message: err.message ?? "Unsubscribe failed" } };
    }
  },
  // ── Settings ──────────────────────────────────────────────────────────────
  async getSettings(ctx) {
    ctx.body = await strapi.plugin("send-mail").service("service").getSettings();
  },
  async saveSettings(ctx) {
    const settings = ctx.request.body;
    if (!settings || typeof settings !== "object") {
      ctx.status = 400;
      ctx.body = { error: { message: "Settings body is required" } };
      return;
    }
    ctx.body = await strapi.plugin("send-mail").service("service").saveSettings(settings);
  },
  // ── Collection introspection ──────────────────────────────────────────────
  async getCollections(ctx) {
    ctx.body = await strapi.plugin("send-mail").service("service").getCollections();
  },
  async getCollectionFields(ctx) {
    const { uid } = ctx.params;
    if (!uid) {
      ctx.status = 400;
      ctx.body = { error: { message: "Collection uid is required" } };
      return;
    }
    ctx.body = await strapi.plugin("send-mail").service("service").getCollectionFields(decodeURIComponent(uid));
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
    },
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
    },
    {
      method: "GET",
      path: "/settings",
      handler: "controller.getSettings",
      config: { policies: [] }
    },
    {
      method: "POST",
      path: "/settings",
      handler: "controller.saveSettings",
      config: { policies: [] }
    },
    {
      method: "GET",
      path: "/collections",
      handler: "controller.getCollections",
      config: { policies: [] }
    },
    {
      method: "GET",
      path: "/collections/:uid/fields",
      handler: "controller.getCollectionFields",
      config: { policies: [] }
    }
  ]
};
const contentAPIRoutes = () => ({
  type: "content-api",
  routes: [
    {
      method: "GET",
      path: "/unsubscribe",
      handler: "controller.unsubscribe",
      config: {
        auth: false,
        policies: []
      }
    }
  ]
});
const routes = {
  admin: adminAPIRoutes,
  "content-api": contentAPIRoutes
};
function renderChildren(children) {
  if (!children) return "";
  return children.map((child) => {
    if (child.type === "link") {
      const text = child.children?.[0]?.text || "Link";
      return `<a href="${child.url}" style="color: #4a7c59; text-decoration: underline;" rel="noopener noreferrer">${text}</a>`;
    }
    if (child.type === "text") {
      let text = child.text || "";
      if (child.bold) text = `<strong>${text}</strong>`;
      if (child.italic) text = `<em>${text}</em>`;
      if (child.underline) text = `<u>${text}</u>`;
      if (child.strikethrough) text = `<s>${text}</s>`;
      if (child.code)
        text = `<code style="background:#f4f4f4; padding:2px 4px; border-radius:3px; font-size:13px;">${text}</code>`;
      return text;
    }
    return "";
  }).join("");
}
function renderBlocksToHtml(blocks, privacyUrl, bannerUrl, unsubscribeUrl) {
  if (!Array.isArray(blocks)) return "";
  let body = "";
  blocks.forEach((block) => {
    switch (block.type) {
      case "paragraph": {
        body += `<p style="margin:0 0 16px; font-size:15px; line-height:1.6; color:#333333;">`;
        body += renderChildren(block.children);
        body += `</p>`;
        break;
      }
      case "heading": {
        const sizes = {
          1: "26px",
          2: "22px",
          3: "18px",
          4: "16px",
          5: "15px",
          6: "14px"
        };
        const size = sizes[block.level] || "18px";
        body += `<h${block.level} style="margin:0 0 12px; font-size:${size}; line-height:1.3; color:#2c2c2c; font-weight:700;">`;
        body += renderChildren(block.children);
        body += `</h${block.level}>`;
        break;
      }
      case "list": {
        const tag = block.format === "ordered" ? "ol" : "ul";
        body += `<${tag} style="margin:0 0 16px; padding-left:24px; color:#333333; font-size:15px; line-height:1.6;">`;
        block.children?.forEach((item) => {
          body += `<li style="margin-bottom:6px;">${renderChildren(item.children)}</li>`;
        });
        body += `</${tag}>`;
        break;
      }
      case "image": {
        const alt = block.image?.alternativeText || "";
        const rawUrl = block.image?.url || "";
        const base = (process.env.STRAPI_UPLOADS_URL || "").replace(/\/$/, "");
        const path = rawUrl.startsWith("/") ? rawUrl : `/${rawUrl}`;
        const url = rawUrl.startsWith("http") ? rawUrl : `${base}${path}`;
        body += `<img src="${url}" alt="${alt}" style="max-width:100%; height:auto; display:block; margin:0 0 16px; border-radius:4px;" />`;
        break;
      }
      case "quote": {
        body += `<blockquote style="margin:0 0 16px; padding:12px 16px; border-left:4px solid #4a7c59; background:#f9f9f9; color:#555; font-style:italic; border-radius:0 4px 4px 0;">`;
        body += renderChildren(block.children);
        body += `</blockquote>`;
        break;
      }
      case "code": {
        body += `<pre style="margin:0 0 16px; padding:16px; background:#f4f4f4; border-radius:4px; overflow-x:auto; font-size:13px; line-height:1.5;"><code style="font-family:monospace; color:#333;">`;
        body += renderChildren(block.children);
        body += `</code></pre>`;
        break;
      }
    }
  });
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0; padding:0; background-color:#f2f4f3; font-family:Arial, sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f2f4f3; padding:20px 10px;">
    <tr>
      <td align="center">
        <table width="900" cellpadding="0" cellspacing="0" style="max-width:900px; width:100%; background:#ffffff; border-radius:8px; overflow:hidden; box-shadow:0 2px 8px rgba(0,0,0,0.08);">

          ${bannerUrl ? `
          <!-- Banner -->
          <tr>
            <td>
              <img src="${bannerUrl}" alt="" style="width:100%; display:block;" />
            </td>
          </tr>` : ""}

          <!-- Body -->
          <tr>
            <td style="padding:32px 40px;">
              ${body}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f9f9f9; border-top:1px solid #e8e8e8; padding:20px 40px; text-align:center;">
              <p style="margin:0; font-size:12px; color:#999999; line-height:1.6;">
                ${unsubscribeUrl ? `
                  Don't want to receive these emails?
                  <a href="${unsubscribeUrl}" style="color:#999999; text-decoration:underline;">Unsubscribe</a>
                  &nbsp;|&nbsp;
                  <a href="${privacyUrl}" style="color:#999999; text-decoration:underline;">Privacy Policy</a>
                ` : `
                  <a href="${privacyUrl}" style="color:#999999; text-decoration:underline;">Privacy Policy</a>
                `}
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>`.trim();
}
const DEFAULT_SETTINGS = {
  collection: "api::subscriber.subscriber",
  emailField: "email",
  statusField: "subscribedStatus",
  activeValue: "active",
  tokenField: "unsubscribeToken"
};
const service = ({ strapi }) => {
  async function getSettings() {
    const store = strapi.store({ type: "plugin", name: "send-mail" });
    const saved = await store.get({ key: "settings" });
    return { ...DEFAULT_SETTINGS, ...saved ?? {} };
  }
  async function saveSettings(settings) {
    const current = await getSettings();
    const merged = { ...current, ...settings };
    const store = strapi.store({ type: "plugin", name: "send-mail" });
    await store.set({ key: "settings", value: merged });
    return merged;
  }
  async function generateToken(documentId) {
    const { randomUUID } = await import("crypto");
    const token = randomUUID();
    const { collection, tokenField } = await getSettings();
    await strapi.documents(collection).update({
      documentId,
      data: { [tokenField]: token }
    });
    return token;
  }
  async function unsubscribe(token) {
    const { collection, tokenField, statusField } = await getSettings();
    const results = await strapi.documents(collection).findMany({
      filters: { [tokenField]: { $eq: token } },
      populate: ["groups"]
    });
    const subscriber = results[0];
    if (!subscriber) throw new Error("Invalid unsubscribe token");
    if (subscriber[statusField] === "unsubscribed") {
      strapi.log.info(`[send-mail] Already unsubscribed: ${subscriber.email}`);
      return { alreadyUnsubscribed: true };
    }
    await strapi.documents(collection).update({
      documentId: subscriber.documentId,
      data: {
        [statusField]: "unsubscribed",
        unsubscribedAt: (/* @__PURE__ */ new Date()).toISOString(),
        groups: []
      }
    });
    strapi.log.info(`[send-mail] Unsubscribed: ${subscriber.email}`);
    return { alreadyUnsubscribed: false };
  }
  async function getGroups() {
    const { collection, emailField, tokenField, statusField, activeValue } = await getSettings();
    const groups = await strapi.documents("api::subscriber-group.subscriber-group").findMany({
      populate: {
        subscribers: {
          filters: { [statusField]: { $eq: activeValue } },
          fields: [emailField, tokenField]
        }
      }
    });
    return groups;
  }
  async function getTemplates() {
    return strapi.documents("api::email-template.email-template").findMany({
      fields: ["name", "subject"]
    });
  }
  async function getCollections() {
    const contentTypes2 = strapi.contentTypes;
    return Object.keys(contentTypes2).filter((uid) => uid.startsWith("api::")).map((uid) => ({
      uid,
      displayName: contentTypes2[uid]?.info?.displayName ?? uid.split(".").pop() ?? uid
    })).sort((a, b) => a.displayName.localeCompare(b.displayName));
  }
  async function getCollectionFields(collectionUid) {
    const contentType = strapi.contentTypes[collectionUid];
    if (!contentType) throw new Error(`Collection not found: ${collectionUid}`);
    const SCALAR_TYPES = ["string", "email", "text", "enumeration", "uid"];
    const fields = Object.entries(contentType.attributes).filter(([, attr]) => SCALAR_TYPES.includes(attr.type)).map(([name, attr]) => ({
      name,
      type: attr.type,
      enum: attr.enum ?? null
    }));
    return fields;
  }
  async function send({ groupId, templateId }) {
    const settings = await getSettings();
    const { collection, emailField, tokenField, statusField, activeValue } = settings;
    const template = await strapi.documents("api::email-template.email-template").findOne({ documentId: templateId, populate: ["banner"] });
    if (!template) throw new Error(`Template not found: ${templateId}`);
    if (!template.body) throw new Error(`Template body is empty`);
    const bannerUrl = template.banner?.url ? `${(process.env.PUBLIC_URL || "").replace(/\/$/, "")}${template.banner.url}` : void 0;
    const group = await strapi.documents("api::subscriber-group.subscriber-group").findOne({
      documentId: groupId,
      populate: {
        subscribers: {
          filters: { [statusField]: { $eq: activeValue } },
          fields: [emailField, tokenField, "documentId"]
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
        let token = subscriber[tokenField];
        if (!token) {
          token = await generateToken(subscriber.documentId);
        }
        return { ...subscriber, _token: token, _email: subscriber[emailField] };
      })
    );
    const frontendUrl = (process.env.FRONTEND_URL || "").replace(/\/$/, "");
    const batchSize = 50;
    const delayMs = 1e3;
    const results = { sent: 0, failed: 0, errors: [] };
    for (let i = 0; i < subscribersWithTokens.length; i += batchSize) {
      const batch = subscribersWithTokens.slice(i, i + batchSize);
      await Promise.all(
        batch.map(async (subscriber) => {
          try {
            const unsubUrl = `${frontendUrl}/unsubscribe?token=${subscriber._token}`;
            const privacyUrl = `${frontendUrl}/privacy`;
            const renderedHtml = renderBlocksToHtml(
              template.body,
              privacyUrl,
              bannerUrl,
              unsubUrl
            );
            await strapi.plugins["email"].services.email.send({
              to: subscriber._email,
              subject: template.subject,
              html: renderedHtml
            });
            results.sent++;
          } catch (err) {
            strapi.log.error(`[send-mail] Failed to send to ${subscriber._email}: ${err.message}`);
            results.failed++;
            results.errors.push(subscriber._email);
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
  return {
    getSettings,
    saveSettings,
    generateToken,
    unsubscribe,
    getGroups,
    getTemplates,
    getCollections,
    getCollectionFields,
    send
  };
};
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
export {
  index as default
};
