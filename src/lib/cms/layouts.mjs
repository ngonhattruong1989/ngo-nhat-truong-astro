// Chuẩn hoá một section dạng danh sách mục sang cách trình bày collage (như "Tranh"):
// mỗi mục có ảnh/medium/date/description và mở bằng lightbox thay vì trang chi tiết.
// Hàm thuần, dùng cho cả seed JSON, D1 và test.

function escapeText(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function toCollageItem(item) {
  if (!item || typeof item !== 'object') return item;
  const thumbnail = typeof item.thumbnail === 'string' ? item.thumbnail.trim() : '';
  const images = Array.isArray(item.images)
    ? item.images.filter((src) => typeof src === 'string' && src.trim())
    : [];
  const description = typeof item.description === 'string' && item.description.trim()
    ? item.description
    : typeof item.html === 'string' && item.html.trim()
      ? item.html
      : item.excerpt
        ? `<p>${escapeText(item.excerpt)}</p>`
        : '';

  return {
    ...item,
    thumbnail,
    // Ảnh bìa cũ trở thành ảnh đầu tiên của bộ ảnh để lightbox có nội dung.
    images: images.length ? images : (thumbnail ? [thumbnail] : []),
    medium: typeof item.medium === 'string' ? item.medium : '',
    date: typeof item.date === 'string' ? item.date : '',
    description,
  };
}

export function toCollageSection(section) {
  if (!section || typeof section !== 'object') return section;
  const next = structuredClone(section);
  for (const locale of Object.keys(next)) {
    const payload = next[locale];
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) continue;
    payload.layout = 'collage';
    if (Array.isArray(payload.items)) payload.items = payload.items.map(toCollageItem);
  }
  return next;
}

// Câu SQL ghi đè cả section; trả về chuỗi đã escape để chạy bằng `wrangler d1 execute --file`.
export function sectionUpdateSql(sectionKey, section) {
  const json = JSON.stringify(section).replace(/'/g, "''");
  return [
    `UPDATE cms_content SET data = '${json}', updated_at = CURRENT_TIMESTAMP WHERE section = '${sectionKey}';`,
    '',
  ].join('\n');
}
