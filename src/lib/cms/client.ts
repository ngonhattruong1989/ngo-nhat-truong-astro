import { LOCALES, buildMediaKey, mediaUrl, slugify, assertId } from '../../lib/cms/media-key.mjs';
import {
  sectionIds, itemsFor, upsertItem, removeItem, removeEverywhere, reorderItem,
  createEmptyFilm, createEmptyItem,
} from '../../lib/cms/content-model.mjs';

export type Locale = 'vi' | 'en' | 'fr';
export type Dict = Record<string, any>;
export type SectionPayload = Record<Locale, Dict>;
export type MediaTarget = { scope: 'film' | 'item' | 'page'; page: string; id?: string; locale?: Locale; kind: string };

export type CmsBootstrap = {
  sections: Record<string, SectionPayload>;
  updatedAt: Record<string, string>;
  mediaBase: string;
};

let db: CmsBootstrap = { sections: {}, updatedAt: {}, mediaBase: '' };

export function hydrate(initial: CmsBootstrap) {
  db = initial;
}

export function mediaKeyOf(url: string): string {
  if (!url) return '';
  if (url.startsWith(`${db.mediaBase}/`)) return url.slice(db.mediaBase.length + 1);
  if (url.startsWith('/media/')) return url.slice('/media/'.length);
  return '';
}

// Production: URL đã là absolute (R2) hoặc đường dẫn legacy còn trong repo.
export function previewSrc(url: string): string {
  return url || '';
}

async function request(url: string, init?: RequestInit) {
  const response = await fetch(url, { credentials: 'same-origin', ...init });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || `HTTP ${response.status}`);
  return body;
}

async function refreshSection(section: string) {
  const data = await request(`/api/cms/${encodeURIComponent(section)}`, { cache: 'no-store' });
  db.sections[section] = data;
  return data;
}

export const store = {
  sections(): string[] {
    return Object.keys(db.sections);
  },
  updatedAt(section: string): string {
    return db.updatedAt[section] || '';
  },
  get(section: string): SectionPayload {
    return structuredClone(db.sections[section]);
  },
  ids(section: string): string[] {
    return sectionIds(db.sections[section]);
  },
  localesFor(section: string, id: string): Locale[] {
    return LOCALES.filter((locale) =>
      itemsFor(db.sections[section], locale).some((item: Dict) => item.id === id)) as Locale[];
  },
  item(section: string, id: string, locale: Locale): Dict | undefined {
    return itemsFor(db.sections[section], locale).find((item: Dict) => item.id === id);
  },
  slugFor(section: string, title: string, currentId?: string): string {
    const base = slugify(title);
    if (!base) return currentId || 'moi';
    const taken = new Set(sectionIds(db.sections[section]));
    if (currentId) taken.delete(currentId);
    if (!taken.has(base)) return base;
    let index = 2;
    while (taken.has(`${base}-${index}`)) index += 1;
    return `${base}-${index}`;
  },
  async saveSection(section: string, data: SectionPayload) {
    await request(`/api/cms/${encodeURIComponent(section)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    db.sections[section] = structuredClone(data);
    db.updatedAt[section] = new Date().toISOString();
  },
  async saveItem(section: string, locale: Locale, item: Dict) {
    await request(`/api/cms/${encodeURIComponent(section)}/items/${encodeURIComponent(item.id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ locale, item }),
    });
    db.sections[section] = upsertItem(db.sections[section], locale, item);
    db.updatedAt[section] = new Date().toISOString();
  },
  async renameItem(section: string, oldId: string, newId: string, locale: Locale, item: Dict) {
    if (oldId === newId) return { renamed: false, moved: [] as string[] };
    const result = await request(`/api/cms/${encodeURIComponent(section)}/items/${encodeURIComponent(oldId)}/rename`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newId, locale, item }),
    });
    await refreshSection(section);
    db.updatedAt[section] = new Date().toISOString();
    return result;
  },
  async deleteEverywhere(section: string, id: string) {
    const result = await request(`/api/cms/${encodeURIComponent(section)}/items/${encodeURIComponent(id)}?scope=all`, {
      method: 'DELETE',
    });
    db.sections[section] = removeEverywhere(db.sections[section], id);
    db.updatedAt[section] = new Date().toISOString();
    return result;
  },
  async deleteMedia(key: string) {
    if (!key) return { key };
    await request(`/api/cms/media?key=${encodeURIComponent(key)}`, { method: 'DELETE' });
    return { key };
  },
  async moveItem(section: string, locale: Locale, id: string, direction: 'up' | 'down') {
    const next = reorderItem(db.sections[section], locale, id, direction);
    await store.saveSection(section, next);
  },
  async createFilm(id: string, title = '') {
    const safeId = assertId(id);
    for (const locale of LOCALES as Locale[]) {
      await store.saveItem('films', locale, createEmptyFilm(safeId, title));
    }
  },
  async createItem(section: string, id: string, title = '') {
    const safeId = assertId(id);
    for (const locale of LOCALES as Locale[]) {
      await store.saveItem(section, locale, createEmptyItem(safeId, title));
    }
  },
  newId(section: string, title: string): string {
    const base = slugify(title) || 'moi';
    const taken = new Set(sectionIds(db.sections[section]));
    if (!taken.has(base)) return base;
    let index = 2;
    while (taken.has(`${base}-${index}`)) index += 1;
    return `${base}-${index}`;
  },
  async upload(file: File, target: MediaTarget): Promise<{ url: string; key: string }> {
    const key = buildMediaKey({
      ...target,
      id: target.id ?? '',
      locale: target.locale ?? 'vi',
      filename: file.name,
      mime: file.type,
    });
    const form = new FormData();
    form.append('file', file);
    form.append('scope', target.scope);
    form.append('page', target.page);
    form.append('id', target.id ?? '');
    form.append('locale', target.locale ?? '');
    form.append('kind', target.kind);
    const body = await request('/api/cms/upload', { method: 'POST', body: form });
    return { url: body.url || mediaUrl(db.mediaBase, key), key: body.key || key };
  },
  mediaBase(): string {
    return db.mediaBase;
  },
};

export type UploadFn = (file: File, target: MediaTarget) => Promise<{ url: string; key: string }>;
export const upload: UploadFn = (file, target) => store.upload(file, target);

// Ảnh crop ghi đè đúng object cũ; thêm ?v= để preview không dùng cache trình duyệt.
export function withVersion(url: string, version: number): string {
  if (!url || !version) return url;
  return `${url}${url.includes('?') ? '&' : '?'}v=${version}`;
}

export async function imageMeta(url: string) {
  return request(`/api/cms/image?meta=1&url=${encodeURIComponent(url)}`, { cache: 'no-store' });
}

export async function replaceImage(url: string, blob: Blob) {
  const form = new FormData();
  form.append('action', 'replace');
  form.append('url', url);
  form.append('file', new File([blob], url.split('/').pop()?.split('?')[0] || 'image', { type: blob.type }));
  return request('/api/cms/image', { method: 'POST', body: form });
}

export async function restoreImage(url: string) {
  const form = new FormData();
  form.append('action', 'restore');
  form.append('url', url);
  return request('/api/cms/image', { method: 'POST', body: form });
}

// Preview thật: lưu draft vào sessionStorage rồi mở trang render bằng CSS của site.
export function openPreview(section: string, id: string, locale: string, item: unknown) {
  try {
    sessionStorage.setItem('cms:draft', JSON.stringify({ section, id, locale, item }));
  } catch {
    /* storage full — preview sẽ dùng nội dung đã lưu */
  }
  window.open(`/admin/preview?section=${encodeURIComponent(section)}&id=${encodeURIComponent(id)}&locale=${encodeURIComponent(locale)}`, '_blank');
}
