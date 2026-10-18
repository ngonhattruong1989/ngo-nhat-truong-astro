function escapeText(text) {
  return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Nội dung cũ có thể là plain-text, cũng có thể đã là HTML (vd contact, paintings).
export function legacyHtml(value) {
  if (typeof value !== 'string' || !value.trim()) return '';
  return /<[a-z][\s\S]*>/i.test(value) ? value : toHtml(value);
}

// Chuyển nội dung plain-text cũ thành HTML: xuống dòng đơn = <br>, dòng trống = đoạn mới.
export function toHtml(text) {
  if (typeof text !== 'string' || !text.trim()) return '';
  if (/^\s*</.test(text)) return text;
  return text
    .split(/\n{2,}/)
    .map((block) => `<p>${block.split('\n').map((line) => escapeText(line)).join('<br>')}</p>`)
    .join('');
}

// Build HTML for the freeform About canvas from legacy items[].
export function sectionsToHtml(items) {
  if (!Array.isArray(items)) return '';
  return items
    .map((item) => `${item?.title ? `<h3>${escapeText(item.title)}</h3>` : ''}${toHtml(item?.content || '')}`)
    .join('');
}

// Như sectionsToHtml nhưng giữ nguyên HTML inline (contact có <a>, paintings có <p>).
export function itemsToCanvasHtml(items) {
  if (!Array.isArray(items)) return '';
  return items
    .map((item) => {
      const body = legacyHtml(item?.content || '');
      const title = item?.title ? `<h3>${escapeText(item.title)}</h3>` : '';
      const wrapped = !body ? '' : /^<(p|h[1-6]|ul|ol|blockquote|figure)\b/i.test(body) ? body : `<p>${body}</p>`;
      return `${title}${wrapped}`;
    })
    .join('');
}
