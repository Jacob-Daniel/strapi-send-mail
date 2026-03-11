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
function renderBlocksToHtml(blocks, bannerUrl) {
  if (!Array.isArray(blocks)) return "";
  let html = "";
  if (bannerUrl) {
    html += `<img src="${bannerUrl}" alt="" style="width:100%; display:block; margin-bottom:24px;" />`;
  }
  blocks.forEach((block) => {
    switch (block.type) {
      case "paragraph": {
        html += '<p style="font-family: Arial, sans-serif; margin-bottom: 12px;">';
        block.children?.forEach((child) => {
          if (child.type === "text") html += child.text;
          else if (child.type === "link") {
            const text = child.children?.[0]?.text || "Link";
            html += `<a href="${child.url}" rel="noopener noreferrer">${text}</a>`;
          }
        });
        html += "</p>";
        break;
      }
      case "heading": {
        const tag = `h${block.level}`;
        html += `<${tag} style="font-family: Arial, sans-serif; margin-bottom: 8px;">`;
        block.children?.forEach((child) => {
          if (child.type === "text") html += child.text;
        });
        html += `</${tag}>`;
        break;
      }
      case "blold": {
        html += `<b>`;
        block.children?.forEach((child) => {
          if (child.type === "text") html += child.text;
        });
        html += `</b>`;
        break;
      }
      case "italic": {
        html += `<i>`;
        block.children?.forEach((child) => {
          if (child.type === "text") html += child.text;
        });
        html += `</i>`;
        break;
      }
      case "list": {
        const tag = block.format === "ordered" ? "ol" : "ul";
        html += `<${tag} style="margin-bottom: 12px; padding-left: 20px;">`;
        block.children?.forEach((item) => {
          html += "<li>";
          item.children?.forEach((child) => {
            if (child.type === "text") html += child.text;
          });
          html += "</li>";
        });
        html += `</${tag}>`;
        break;
      }
      case "image": {
        const alt = block.image?.alternativeText || "";
        const rawUrl = block.image?.url || "";
        const url = rawUrl.startsWith("http") ? rawUrl : `${process.env.STRAPI_UPLOADS_URL || "/uploads/"}${rawUrl}`;
        html += `<img src="${url}" alt="${alt}" style="max-width:100%; display:block; margin-bottom:12px;" />`;
        break;
      }
      case "quote": {
        html += `<blockquote style="border-left: 3px solid #ccc; padding-left: 12px; margin-bottom: 12px;">`;
        block.children?.forEach((child) => {
          if (child.type === "text") html += child.text;
        });
        html += "</blockquote>";
        break;
      }
    }
  });
  return html;
}
const service = ({ strapi }) => ({
  async getGroups() {
    return strapi.documents("api::subscriber-group.subscriber-group").findMany({
      fields: ["documentId", "name"]
    });
  },
  async getTemplates() {
    return strapi.documents("api::email-template.email-template").findMany({
      fields: ["documentId", "name", "subject"]
    });
  },
  async send({ groupId, templateId }) {
    const template = await strapi.documents("api::email-template.email-template").findOne({ documentId: templateId });
    const bannerUrl = template.banner?.url ? `${process.env.STRAPI_UPLOADS_URL}/${template.banner.url}` : void 0;
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
    const renderedHtml = renderBlocksToHtml(template.body, bannerUrl);
    const batchSize = 50;
    const delayMs = 1e3;
    const results = { sent: 0, failed: 0, errors: [] };
    strapi.log.info(`[send-mail] Starting send to ${subscribers.length} subscribers`);
    for (let i = 0; i < subscribers.length; i += batchSize) {
      const batch = subscribers.slice(i, i + batchSize);
      await Promise.all(
        batch.map(async (subscriber) => {
          try {
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
      if (i + batchSize < subscribers.length) {
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
