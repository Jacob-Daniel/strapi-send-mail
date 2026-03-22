// ── Types ──────────────────────────────────────────────────────────────────

export interface CampsiteData {
  general?: {
    title?: string;
    website?: string;
    tagline?: string;
  };
  contact?: {
    phone?: string;
    email?: string;
  };
  social?: Array<{
    title?: string;
    url?: string;
    icon?: string;
  }>;
}

// ── Facebook SVG icon ─────────────────────────────────────────────────────

const FB_ICON = `<img src="https://upload.wikimedia.org/wikipedia/commons/thumb/0/05/Facebook_Logo_%282019%29.png/600px-Facebook_Logo_%282019%29.png" alt="Facebook" width="20" height="20" style="vertical-align:middle; border-radius:4px;" />`;

// ── Pre-footer renderer ───────────────────────────────────────────────────

export default function renderPreFooter(campsite: CampsiteData): string {
  const { general, contact, social } = campsite;

  const title = general?.title ?? '';
  const website = general?.website ?? '';
  const tagline = general?.tagline ?? '';
  const phone = contact?.phone ?? '';
  const email = contact?.email ?? '';

  // Only render social links that have a url
  const socialLinks = (social ?? [])
    .filter((s) => s.url)
    .map((s) => {
      const isFacebook =
        s.icon?.toLowerCase().includes('fb') || s.title?.toLowerCase().includes('facebook');
      const icon = isFacebook ? FB_ICON : '';
      const label = s.title ?? 'Social';
      const href = s.url!.startsWith('http') ? s.url! : `https://www.facebook.com/${s.url}`;
      return `<a href="${href}" style="display:inline-flex; align-items:center; gap:6px; color:#4a7c59; text-decoration:none; font-size:13px;" target="_blank" rel="noopener noreferrer">${icon} ${label}</a>`;
    });

  // Build rows — only include lines that have content
  const rows: string[] = [];

  if (title) {
    rows.push(`
      <tr>
        <td style="padding-bottom:4px;">
          <span style="font-size:15px; font-weight:700; color:#2c2c2c;">${title}</span>
        </td>
      </tr>`);
  }

  if (tagline) {
    rows.push(`
      <tr>
        <td style="padding-bottom:10px;">
          <span style="font-size:13px; color:#777777; font-style:italic;">${tagline}</span>
        </td>
      </tr>`);
  }

  if (phone || email || website) {
    const parts: string[] = [];
    if (phone)
      parts.push(
        `<a href="tel:${phone}" style="color:#4a7c59; text-decoration:none; font-size:13px;">${phone}</a>`
      );
    if (email)
      parts.push(
        `<a href="mailto:${email}" style="color:#4a7c59; text-decoration:none; font-size:13px;">${email}</a>`
      );
    if (website)
      parts.push(
        `<a href="${website.startsWith('http') ? website : `https://${website}`}" style="color:#4a7c59; text-decoration:none; font-size:13px;" target="_blank" rel="noopener noreferrer">${website.replace(/^https?:\/\//, '')}</a>`
      );
    rows.push(`
      <tr>
        <td style="padding-bottom:10px;">
          ${parts.join('<span style="color:#cccccc; margin:0 8px;">|</span>')}
        </td>
      </tr>`);
  }

  if (socialLinks.length > 0) {
    rows.push(`
      <tr>
        <td style="padding-bottom:4px;">
          ${socialLinks.join('<span style="margin:0 8px;"></span>')}
        </td>
      </tr>`);
  }

  if (rows.length === 0) return '';

  return `
  <!-- Pre-footer -->
  <tr>
    <td style="background:#f0f4f1; border-top:1px solid #dde8de; border-bottom:1px solid #dde8de; padding:24px 40px;">
      <table cellpadding="0" cellspacing="0" width="100%">
        ${rows.join('')}
      </table>
    </td>
  </tr>`;
}
