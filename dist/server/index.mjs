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
function renderBlocksToHtml(blocks, bannerUrl, unsubscribeUrl) {
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

  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f2f4f3; padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px; width:100%; background:#ffffff; border-radius:8px; overflow:hidden; box-shadow:0 2px 8px rgba(0,0,0,0.08);">

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
              ${unsubscribeUrl ? `
              <p style="margin:0; font-size:12px; color:#999999; line-height:1.6;">
                Don't want to receive these emails?
                <a href="${unsubscribeUrl}" style="color:#999999; text-decoration:underline;">Unsubscribe</a>
              </p>` : ""}
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>`.trim();
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
      populate: {
        subscribers: {
          filters: { subscribedStatus: { $eq: "active" } },
          fields: ["email", "unsubscribeToken"]
        }
      }
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
export {
  index as default
};
