export default function renderBlocksToHtml(blocks: any[], bannerUrl?: string): string {
  if (!Array.isArray(blocks)) return '';

  let html = '';

  if (bannerUrl) {
    html += `<img src="${bannerUrl}" alt="" style="width:100%; display:block; margin-bottom:24px;" />`;
  }

  blocks.forEach((block) => {
    switch (block.type) {
      case 'paragraph': {
        html += '<p style="font-family: Arial, sans-serif; margin-bottom: 12px;">';
        block.children?.forEach((child: any) => {
          if (child.type === 'text') html += child.text;
          else if (child.type === 'link') {
            const text = child.children?.[0]?.text || 'Link';
            html += `<a href="${child.url}" rel="noopener noreferrer">${text}</a>`;
          }
        });
        html += '</p>';
        break;
      }
      case 'heading': {
        const tag = `h${block.level}`;
        html += `<${tag} style="font-family: Arial, sans-serif; margin-bottom: 8px;">`;
        block.children?.forEach((child: any) => {
          if (child.type === 'text') html += child.text;
        });
        html += `</${tag}>`;
        break;
      }
      case 'blold': {
        html += `<b>`;
        block.children?.forEach((child: any) => {
          if (child.type === 'text') html += child.text;
        });
        html += `</b>`;
        break;
      }
      case 'italic': {
        html += `<i>`;
        block.children?.forEach((child: any) => {
          if (child.type === 'text') html += child.text;
        });
        html += `</i>`;
        break;
      }
      case 'list': {
        const tag = block.format === 'ordered' ? 'ol' : 'ul';
        html += `<${tag} style="margin-bottom: 12px; padding-left: 20px;">`;
        block.children?.forEach((item: any) => {
          html += '<li>';
          item.children?.forEach((child: any) => {
            if (child.type === 'text') html += child.text;
          });
          html += '</li>';
        });
        html += `</${tag}>`;
        break;
      }
      case 'image': {
        const alt = block.image?.alternativeText || '';
        // Strapi returns relative URLs — make absolute for email
        const rawUrl = block.image?.url || '';
        const url = rawUrl.startsWith('http')
          ? rawUrl
          : `${process.env.STRAPI_UPLOADS_URL || '/uploads/'}${rawUrl}`;

        html += `<img src="${url}" alt="${alt}" style="max-width:100%; display:block; margin-bottom:12px;" />`;
        break;
      }
      case 'quote': {
        html += `<blockquote style="border-left: 3px solid #ccc; padding-left: 12px; margin-bottom: 12px;">`;
        block.children?.forEach((child: any) => {
          if (child.type === 'text') html += child.text;
        });
        html += '</blockquote>';
        break;
      }
      default:
        break;
    }
  });

  return html;
}
