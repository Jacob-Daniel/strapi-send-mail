# strapi-plugin-send-mail

A [Strapi v5](https://strapi.io) plugin for sending batch emails to subscriber groups using rich-text email templates — straight from the Strapi admin panel.

![Strapi v5](https://img.shields.io/badge/Strapi-v5-4945FF?style=flat-square&logo=strapi)
![License](https://img.shields.io/github/license/Jacob-Daniel/strapi-send-mail?style=flat-square)
![npm](https://img.shields.io/npm/v/strapi-plugin-send-mail?style=flat-square)

---

## Features

- Send batch emails from the Strapi admin UI
- Target subscriber groups with many-to-many relations
- Rich-text email templates using Strapi's native blocks editor
- 🖼Optional banner image per template
- Batched sending with configurable batch size and delay
- Uses your existing Strapi email plugin (Sendgrid, SMTP, etc.)

---

## Requirements

- Strapi v5
- [`@strapi/plugin-email`](https://docs.strapi.io/dev-docs/plugins/email) configured in your project

---

## Installation

Clone or download the plugin into your Strapi project:
```bash
git clone https://github.com/Jacob-Daniel/strapi-send-mail.git src/plugins/send-mail
```

Then register it in your Strapi config:
```ts
// config/plugins.ts
export default {
  'send-mail': {
    enabled: true,
    resolve: './src/plugins/send-mail',
  },
};
```

---

## Content Types

This plugin expects the following content types to exist in your Strapi project.

### `api::subscriber.subscriber`

| Field | Type | Notes |
|---|---|---|
| `email` | Email | Required, unique |
| `subscribedStatus` | Enumeration | `active`, `unsubscribed`, `bounced` |
| `subscribedAt` | Datetime | |
| `unsubscribedAt` | Datetime | |
| `groups` | Relation (manyToMany) | mapped by `subscribers` on subscriber-group |

### `api::subscriber-group.subscriber-group`

| Field | Type | Notes |
|---|---|---|
| `name` | String | Required |
| `description` | Text | |
| `subscribers` | Relation (manyToMany) | inversedBy `groups` on subscriber |

### `api::email-template.email-template`

| Field | Type | Notes |
|---|---|---|
| `name` | String | Required |
| `subject` | String | Required |
| `body` | Blocks (rich text) | Supports headings, paragraphs, lists, quotes, inline images |
| `banner` | Media (single image) | Optional — prepended above body |

---

## Usage

1. Create subscriber groups and add subscribers via the Strapi admin
2. Create an email template with a subject and rich-text body
3. Navigate to **Send Mail** in the admin sidebar
4. Select a recipient group and a template
5. Click **Send Emails**

The plugin will send to all `active` subscribers in the selected group, in batches of 50 with a 1 second delay between batches.

---

## How It Works

```
Admin UI → POST /send-mail/send { groupId, templateId }
         → Fetch template (subject + blocks body)
         → Fetch group → filter active subscribers
         → Render blocks to HTML
         → Batch send via strapi email plugin
         → Return { sent, failed, errors[] }
```

Email HTML is rendered from Strapi's native blocks format, supporting:

- Paragraphs
- Headings (h1–h6)
- Ordered and unordered lists
- Blockquotes
- Images (absolute URL resolved against your Strapi public URL)

---

## Configuration

No additional configuration is required beyond enabling the plugin. The plugin uses your existing `@strapi/plugin-email` configuration.

To set the base URL for resolving image paths from Strapi blocks, set the following in your environment:

```env
STRAPI_UPLOADS_URL=https://your-strapi-domain.com
```

---

## Admin Routes

| Method | Path | Description |
|---|---|---|
| GET | `/send-mail/groups` | List all subscriber groups |
| GET | `/send-mail/templates` | List all email templates |
| POST | `/send-mail/send` | Send emails to a group |

All routes are admin-only and require an authenticated Strapi admin session.

---

## Development

```bash
git clone https://github.com/Jacob-Daniel/strapi-send-mail.git
cd strapi-send-mail

npm install
npm run build
npm run watch   # for development with watch mode
```

To test inside a Strapi project, use `npm link` or `yalc`.

---

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

---

## License

[MIT](./LICENSE) © [Jacob Daniel](https://jacobdaniel.co.uk)