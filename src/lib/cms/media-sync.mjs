export const LOCALES = ['vi', 'en', 'fr'];

// Ảnh/video dùng chung cho cả 3 ngôn ngữ; chữ thì mỗi ngôn ngữ tự nhập.
// thumbnailWidth/thumbnailAlign: khung hiển thị của chính ảnh thumbnail nên đi theo ảnh (dùng chung 3 ngôn ngữ).
export const ITEM_MEDIA_FIELDS = ['poster', 'thumbnail', 'thumbnailWidth', 'thumbnailAlign', 'stills', 'bts', 'images', 'videoUrl'];
export const HOME_MEDIA_FIELDS = ['logo', 'heroImages'];

export function pickMedia(item, fields = ITEM_MEDIA_FIELDS) {
  const picked = {};
  for (const field of fields) {
    if (item && Object.hasOwn(item, field)) picked[field] = item[field];
  }
  return picked;
}

// Sao chép media của item vừa lưu sang 2 ngôn ngữ còn lại.
// Ngôn ngữ chưa có item thì tạo mới với media + chữ rỗng để người dùng tự điền.
export function syncItemMedia(sectionData, sourceLocale, item, { create = true } = {}) {
  const next = structuredClone(sectionData || {});
  const media = pickMedia(item);
  if (Object.keys(media).length === 0) return next;

  for (const locale of LOCALES) {
    if (locale === sourceLocale || !next[locale]) continue;
    if (!Array.isArray(next[locale].items)) next[locale].items = [];
    const items = next[locale].items;
    const index = items.findIndex((entry) => entry.id === item.id);
    if (index >= 0) items[index] = { ...items[index], ...media };
    else if (create) items.push({ id: item.id, title: '', ...media });
  }
  return next;
}

export function syncHomeMedia(sectionData, sourceLocale) {
  const next = structuredClone(sectionData || {});
  const source = next[sourceLocale];
  if (!source) return next;
  const media = pickMedia(source, HOME_MEDIA_FIELDS);
  for (const locale of LOCALES) {
    if (locale === sourceLocale || !next[locale]) continue;
    Object.assign(next[locale], media);
  }
  return next;
}
