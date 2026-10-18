import about from '../../data/about.json' with { type: 'json' };
import artwork from '../../data/artwork.json' with { type: 'json' };
import blog from '../../data/blog.json' with { type: 'json' };
import contact from '../../data/contact.json' with { type: 'json' };
import films from '../../data/films.json' with { type: 'json' };
import music from '../../data/music.json' with { type: 'json' };
import paintings from '../../data/paintings.json' with { type: 'json' };
import poetry from '../../data/poetry.json' with { type: 'json' };
import spaces from '../../data/spaces.json' with { type: 'json' };
import uiTranslations from '../../data/ui-translations.json' with { type: 'json' };

export const SECTION_DATA = {
  about,
  artwork,
  blog,
  contact,
  films,
  music,
  paintings,
  poetry,
  spaces,
  'ui-translations': uiTranslations,
};

export const CMS_SECTIONS = Object.keys(SECTION_DATA);
export const LOCALES = ['vi', 'en', 'fr'];
// Hai trang này là canvas tự do: nội dung nằm ở `html`, items chỉ còn để tương thích ngược.
export const CANVAS_SECTIONS = new Set(['about', 'contact']);

export function validateSectionData(section, data) {
  if (!Object.hasOwn(SECTION_DATA, section)) return { valid: false, error: 'Unknown content section.' };
  if (!data || typeof data !== 'object' || Array.isArray(data)) return { valid: false, error: 'Content must be an object.' };
  const isCanvas = CANVAS_SECTIONS.has(section);
  for (const locale of LOCALES) {
    const value = data[locale];
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return { valid: false, error: `Missing locale: ${locale}.` };
    }
    if (section === 'ui-translations') {
      if (typeof value.title !== 'string' && value.title !== undefined) return { valid: false, error: `Invalid title for ${locale}.` };
      if (!Array.isArray(value.menu) || typeof value.tagline !== 'string' || typeof value.footer !== 'string' || typeof value.homeWelcome !== 'string') {
        return { valid: false, error: `Invalid UI translations for ${locale}.` };
      }
      continue;
    }
    if (isCanvas) {
      if (value.html !== undefined && typeof value.html !== 'string') {
        return { valid: false, error: `Invalid html for ${locale}.` };
      }
      if (value.title !== undefined && typeof value.title !== 'string') {
        return { valid: false, error: `Invalid title for ${locale}.` };
      }
      if (typeof value.html !== 'string' && !Array.isArray(value.items)) {
        return { valid: false, error: `Missing html for ${locale}.` };
      }
      if (Array.isArray(value.items) && value.items.some((item) => !item || typeof item !== 'object' || Array.isArray(item))) {
        return { valid: false, error: `Invalid item in ${locale}.` };
      }
      continue;
    }
    if (typeof value.title !== 'string') return { valid: false, error: `Invalid title for ${locale}.` };
    if (!Array.isArray(value.items)) {
      return { valid: false, error: `Invalid items for ${locale}.` };
    }
    if (value.layout !== undefined && typeof value.layout !== 'string') {
      return { valid: false, error: `Invalid layout for ${locale}.` };
    }
    if (value.description !== undefined && typeof value.description !== 'string') {
      return { valid: false, error: `Invalid description for ${locale}.` };
    }
    for (const item of value.items) {
      if (!item || typeof item !== 'object' || Array.isArray(item)) {
        return { valid: false, error: `Invalid item in ${locale}.` };
      }
      if (typeof item.id !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item.id)) {
        return { valid: false, error: `Invalid item id in ${locale}.` };
      }
      if (item.html !== undefined && typeof item.html !== 'string') {
        return { valid: false, error: `Invalid item html in ${locale}.` };
      }
      if (item.crew !== undefined && typeof item.crew !== 'string') {
        return { valid: false, error: `Invalid item crew in ${locale}.` };
      }
    }
  }
  return { valid: true };
}

export async function getSectionData(section, db) {
  const fallback = SECTION_DATA[section];
  if (!fallback) return undefined;
  if (db) {
    try {
      const row = await db.prepare('SELECT data FROM cms_content WHERE section = ?').bind(section).first();
      if (row?.data) {
        const data = typeof row.data === 'string' ? JSON.parse(row.data) : row.data;
        if (validateSectionData(section, data).valid) return data;
      }
    } catch (error) {
      console.warn(`CMS content fallback for ${section}:`, error);
    }
  }
  return fallback;
}

export async function saveSectionData(section, data, db) {
  const validation = validateSectionData(section, data);
  if (!validation.valid) return validation;
  if (!db) return { valid: false, error: 'Content database is not configured.' };
  await db.prepare(`
    INSERT INTO cms_content (section, data, updated_at)
    VALUES (?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(section) DO UPDATE SET data = excluded.data, updated_at = CURRENT_TIMESTAMP
  `).bind(section, JSON.stringify(data)).run();
  return { valid: true };
}

export async function getSectionUpdatedAt(section, db) {
  if (!db) return '';
  try {
    const row = await db.prepare('SELECT updated_at FROM cms_content WHERE section = ?').bind(section).first();
    return row?.updated_at || '';
  } catch {
    return '';
  }
}
