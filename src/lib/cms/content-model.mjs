import { LOCALES, assertId } from './media-key.mjs';

export const SECTION_KEYS = [
  'about', 'films', 'music', 'paintings', 'poetry', 'artwork', 'spaces', 'blog', 'contact', 'ui-translations',
];
export const PAGE_SECTIONS = ['music', 'paintings', 'poetry', 'artwork', 'spaces', 'blog'];

export function emptyLocalePayload() {
  return { title: '', layout: 'grid', description: '', items: [] };
}

export function itemsFor(section, locale) {
  const items = section?.[locale]?.items;
  return Array.isArray(items) ? items : [];
}

export function sectionIds(section) {
  const seen = new Set();
  for (const locale of LOCALES) {
    for (const item of itemsFor(section, locale)) {
      if (item && typeof item.id === 'string' && !seen.has(item.id)) seen.add(item.id);
    }
  }
  return [...seen];
}

export function localesFor(section, id) {
  return LOCALES.filter((locale) => itemsFor(section, locale).some((item) => item.id === id));
}

export function upsertItem(section, locale, item, { append = true } = {}) {
  const next = structuredClone(section || {});
  if (!next[locale]) next[locale] = emptyLocalePayload();
  if (!Array.isArray(next[locale].items)) next[locale].items = [];
  const index = next[locale].items.findIndex((entry) => entry.id === item.id);
  if (index >= 0) next[locale].items[index] = { ...next[locale].items[index], ...item };
  else if (append) next[locale].items.push(item);
  return next;
}

export function removeItem(section, locale, id) {
  const next = structuredClone(section || {});
  if (!Array.isArray(next[locale]?.items)) return next;
  next[locale].items = next[locale].items.filter((item) => item.id !== id);
  return next;
}

// Xoá vĩnh viễn: bỏ id khỏi MỌI locale (khớp quyết định "xóa cả 3 locale + R2").
export function removeEverywhere(section, id) {
  let next = structuredClone(section || {});
  for (const locale of LOCALES) next = removeItem(next, locale, id);
  return next;
}

export function reorderItem(section, locale, id, direction) {
  const next = structuredClone(section || {});
  const items = next[locale]?.items;
  if (!Array.isArray(items)) return next;
  const index = items.findIndex((item) => item.id === id);
  const target = direction === 'up' ? index - 1 : index + 1;
  if (index < 0 || target < 0 || target >= items.length) return next;
  [items[index], items[target]] = [items[target], items[index]];
  return next;
}

export function createEmptyFilm(id, title) {
  return {
    id: assertId(id), title, thumbnail: '', genre: '', year: '', duration: '',
    youtubeId: '', videoUrl: '', poster: '', stills: [], crew: '', bts: [],
  };
}

export function createEmptyItem(id, title) {
  return { id: assertId(id), title, thumbnail: '', date: '', excerpt: '', html: '' };
}

export function validateV2(section, data) {
  if (!SECTION_KEYS.includes(section)) return { valid: false, error: 'Unknown content section.' };
  if (!data || typeof data !== 'object' || Array.isArray(data)) return { valid: false, error: 'Content must be an object.' };
  for (const locale of LOCALES) {
    const payload = data[locale];
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      return { valid: false, error: `Missing locale: ${locale}.` };
    }
    if (payload.title !== undefined && typeof payload.title !== 'string') {
      return { valid: false, error: `Invalid title for ${locale}.` };
    }
    if (section === 'about' || section === 'contact') {
      const hasHtml = typeof payload.html === 'string';
      const hasLegacy = Array.isArray(payload.items);
      if (!hasHtml && !hasLegacy) return { valid: false, error: `Invalid html for ${locale}.` };
      continue;
    }
    if (section === 'ui-translations') continue;
    if (payload.items !== undefined && !Array.isArray(payload.items)) {
      return { valid: false, error: `Invalid items for ${locale}.` };
    }
    for (const item of payload.items || []) {
      if (!item || typeof item !== 'object' || Array.isArray(item)) return { valid: false, error: `Invalid item in ${locale}.` };
      if (typeof item.id !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item.id)) {
        return { valid: false, error: `Invalid item id in ${locale}.` };
      }
    }
  }
  return { valid: true };
}
