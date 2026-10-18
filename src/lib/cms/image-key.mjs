const ORIGINAL_PREFIX = '.originals/';

// URL công khai (R2 domain) → key; URL tương đối trong site → key của asset trong bucket.
export function keyFromUrl(url, mediaBase = '') {
  const clean = String(url || '').split('?')[0].split('#')[0];
  if (!clean) return '';
  const base = String(mediaBase || '').replace(/\/+$/, '');
  if (base && clean.startsWith(`${base}/`)) return clean.slice(base.length + 1);
  if (clean.startsWith('/media/')) return clean.slice('/media/'.length);
  if (clean.startsWith('/')) return clean.slice(1);
  return '';
}

export function originalKey(key) {
  return `${ORIGINAL_PREFIX}${key}`;
}

export function isImageKey(key) {
  return /\.(jpe?g|png|webp|gif|avif|svg)$/i.test(String(key || ''));
}
