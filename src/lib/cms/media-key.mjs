export const LOCALES = ['vi', 'en', 'fr'];
export const MEDIA_KINDS = ['poster', 'thumbnail', 'stills', 'bts', 'video', 'images', 'hero'];

const ID_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const EXT_BY_MIME = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
};
const SAFE_EXT = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif', 'mp4', 'webm']);

export function assertId(value, label = 'id') {
  if (typeof value !== 'string' || !ID_RE.test(value) || value.length > 80) {
    throw new Error(`Invalid ${label}: ${value}`);
  }
  return value;
}

export function assertLocale(locale) {
  if (!LOCALES.includes(locale)) throw new Error(`Invalid locale: ${locale}`);
  return locale;
}

export function slugify(input) {
  return String(input ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

export function extensionFor(mime, originalName = '') {
  const key = String(mime || '').toLowerCase();
  if (EXT_BY_MIME[key]) return EXT_BY_MIME[key];
  const match = /\.([a-z0-9]+)$/i.exec(String(originalName || ''));
  const ext = match?.[1]?.toLowerCase();
  if (ext && SAFE_EXT.has(ext)) return ext === 'jpeg' ? 'jpg' : ext;
  throw new Error(`Unsupported file type: ${mime || originalName}`);
}

export function mediaPrefix({ scope, page, id, locale }) {
  if (scope === 'film') return `films/${assertId(id, 'film id')}`;
  const safePage = assertId(page, 'page');
  if (scope === 'page') return `${safePage}/${assertLocale(locale)}`;
  if (scope === 'item') return `${safePage}/${assertId(id, 'item id')}`;
  throw new Error(`Invalid scope: ${scope}`);
}

export function buildMediaKey({ scope, page, id, locale, kind, filename, mime, now = Date.now() }) {
  if (!MEDIA_KINDS.includes(kind)) throw new Error(`Invalid media kind: ${kind}`);
  const ext = extensionFor(mime, filename);
  const base = slugify(filename) || 'file';
  const stamp = Math.max(0, Number(now) || 0).toString(36).padStart(4, '0');
  return `${mediaPrefix({ scope, page, id, locale })}/${kind}/${stamp}-${base}.${ext}`;
}

export function mediaFolder(key) {
  const parts = String(key).split('/');
  parts.pop();
  return parts.join('/');
}

export function mediaUrl(baseUrl, key) {
  return `${String(baseUrl).replace(/\/+$/, '')}/${String(key).replace(/^\/+/, '')}`;
}
