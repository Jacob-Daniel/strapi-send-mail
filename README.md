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
- 🖼 Optional banner image per template
- Batched sending with configurable batch size and delay
- **Choose any Strapi collection as your subscriber source** — no hard dependency on `api::subscriber`
- **Map fields visually** — pick which field is the email address, status, active value, and unsubscribe token
- Settings persisted in Strapi's plugin store (survive restarts)
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

The plugin requires two content types to always be present in your project (these are for grouping and templates). The **subscriber collection** is now configurable — see [Settings](#settings).

### `api::subscriber-group.subscriber-group`

| Field         | Type                  | Notes                                |
| ------------- | --------------------- | ------------------------------------ |
| `name`        | String                | Required                             |
| `description` | Text                  |                                      |
| `subscribers` | Relation (manyToMany) | inversedBy the configured collection |

### `api::email-template.email-template`

| Field     | Type                 | Notes                                                       |
| --------- | -------------------- | ----------------------------------------------------------- |
| `name`    | String               | Required                                                    |
| `subject` | String               | Required                                                    |
| `body`    | Blocks (rich text)   | Supports headings, paragraphs, lists, quotes, inline images |
| `banner`  | Media (single image) | Optional — prepended above body                             |

### Default subscriber collection: `api::subscriber.subscriber`

If you keep the default, the plugin expects:

| Field              | Type                  | Notes                                       |
| ------------------ | --------------------- | ------------------------------------------- |
| `email`            | Email                 | Required, unique                            |
| `subscribedStatus` | Enumeration           | `active`, `unsubscribed`, `bounced`         |
| `subscribedAt`     | Datetime              |                                             |
| `unsubscribedAt`   | Datetime              |                                             |
| `unsubscribeToken` | String                | Managed by the plugin                       |
| `groups`           | Relation (manyToMany) | mapped by `subscribers` on subscriber-group |

---

## Settings

Navigate to **Send Mail → Settings** in the admin sidebar to configure:

| Setting                     | Description                                                                                |
| --------------------------- | ------------------------------------------------------------------------------------------ |
| **Subscriber Collection**   | Any `api::*` collection in your project                                                    |
| **Email Field**             | The field holding the recipient's email address                                            |
| **Status Field**            | Field used to filter active vs inactive subscribers                                        |
| **Active Status Value**     | Records matching this value will receive email. Enum fields show a dropdown automatically. |
| **Unsubscribe Token Field** | Field used to store and look up the per-subscriber unsubscribe token                       |

Settings are stored in Strapi's plugin store and persist across restarts. Changing the collection does **not** migrate data — it only changes which collection the plugin reads from.

---

## Usage

1. Open **Send Mail → Settings**, pick your subscriber collection and map its fields
2. Create subscriber groups and associate subscriber records via the Strapi admin
3. Create an email template with a subject and rich-text body
4. Navigate to **Send Mail → Send**
5. Select a recipient group and a template, then click **Send Emails**

The plugin will send to all subscribers in the selected group where the status field matches the configured active value, in batches of 50 with a 1-second delay between batches.

---

## How It Works

```
Admin UI
  → Settings: pick collection + field mappings (stored in plugin store)

Admin UI → POST /send-mail/send { groupId, templateId }
         → Load settings from store
         → Fetch template (subject + blocks body)
         → Fetch group → filter subscribers where statusField = activeValue
         → Ensure each subscriber has an unsubscribe token (generate if missing)
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

## Admin Routes

| Method | Path                                 | Description                             |
| ------ | ------------------------------------ | --------------------------------------- |
| GET    | `/send-mail/groups`                  | List all subscriber groups              |
| GET    | `/send-mail/templates`               | List all email templates                |
| POST   | `/send-mail/send`                    | Send emails to a group                  |
| GET    | `/send-mail/settings`                | Get current plugin settings             |
| POST   | `/send-mail/settings`                | Save plugin settings                    |
| GET    | `/send-mail/collections`             | List all available `api::*` collections |
| GET    | `/send-mail/collections/:uid/fields` | List scalar fields for a collection     |

All routes are admin-only and require an authenticated Strapi admin session.

---

## Environment Variables

```env
# Base URL for resolving Strapi media URLs in email bodies
PUBLIC_URL=https://your-strapi-domain.com

# Base URL for unsubscribe and privacy links in emails
FRONTEND_URL=https://your-frontend-domain.com
```

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
