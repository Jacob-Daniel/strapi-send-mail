function renderChildren(children: any[]): string {
  if (!children) return '';
  return children
    .map((child) => {
      if (child.type === 'link') {
        const text = child.children?.[0]?.text || 'Link';
        return `<a href="${child.url}" rel="noopener noreferrer">${text}</a>`;
      }
      if (child.type === 'text') {
        let text = child.text || '';
        if (child.bold) text = `<b>${text}</b>`;
        if (child.italic) text = `<i>${text}</i>`;
        if (child.underline) text = `<u>${text}</u>`;
        if (child.strikethrough) text = `<s>${text}</s>`;
        if (child.code) text = `<code>${text}</code>`;
        return text;
      }
      return '';
    })
    .join('');
}

export default function renderBlocksToHtml(
  blocks: any[],
  bannerUrl?: string,
  unsubscribeUrl?: string
): string {
  if (!Array.isArray(blocks)) return '';

  let html = '';

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
      case 'paragraph': {
        html += `<p style="font-family: Arial, sans-serif; margin-bottom: 12px;">`;
        html += renderChildren(block.children);
        html += `</p>`;
        break;
      }
      case 'heading': {
        const tag = `h${block.level}`;
        html += `<${tag} style="font-family: Arial, sans-serif; margin-bottom: 8px;">`;
        html += renderChildren(block.children);
        html += `</${tag}>`;
        break;
      }
      case 'list': {
        const tag = block.format === 'ordered' ? 'ol' : 'ul';
        html += `<${tag} style="margin-bottom: 12px; padding-left: 20px;">`;
        block.children?.forEach((item: any) => {
          html += `<li>${renderChildren(item.children)}</li>`;
        });
        html += `</${tag}>`;
        break;
      }
      case 'image': {
        const alt = block.image?.alternativeText || '';
        const rawUrl = block.image?.url || '';
        const base = (process.env.STRAPI_UPLOADS_URL || '').replace(/\/$/, '');
        const path = rawUrl.startsWith('/') ? rawUrl : `/${rawUrl}`;
        const url = rawUrl.startsWith('http') ? rawUrl : `${base}${path}`;
        html += `<img src="${url}" alt="${alt}" style="max-width:100%; display:block; margin-bottom:12px;" />`;
        break;
      }
      case 'quote': {
        html += `<blockquote style="border-left: 3px solid #ccc; padding-left: 12px; margin-bottom: 12px;">`;
        html += renderChildren(block.children);
        html += `</blockquote>`;
        break;
      }
      case 'code': {
        html += `<pre style="background:#f4f4f4; padding:12px; margin-bottom:12px;"><code>`;
        html += renderChildren(block.children);
        html += `</code></pre>`;
        break;
      }
      default:
        break;
    }
  });

  return html;
}
