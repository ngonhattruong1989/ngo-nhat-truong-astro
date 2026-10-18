const ATTR_SRC = /\b(?:src|poster)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/gi;

function normalizeKey(value, baseUrl) {
  const url = String(value || '').trim();
  if (!url) return '';
  const base = String(baseUrl || '').replace(/\/+$/, '');
  if (base && url.startsWith(`${base}/`)) return url.slice(base.length + 1);
  if (url.startsWith('/media/')) return url.slice('/media/'.length);
  if (url.startsWith('/')) return url.slice(1);
  return '';
}

export function keysFromHtml(html, baseUrl) {
  const keys = new Set();
  if (typeof html !== 'string' || !html) return [];
  let match;
  ATTR_SRC.lastIndex = 0;
  while ((match = ATTR_SRC.exec(html)) !== null) {
    const key = normalizeKey(match[1] ?? match[2] ?? match[3], baseUrl);
    if (key && !key.includes('..')) keys.add(key);
  }
  return [...keys];
}

export function keysFromItem(item, baseUrl) {
  const keys = new Set();
  const walk = (value) => {
    if (typeof value === 'string') {
      const direct = normalizeKey(value, baseUrl);
      if (direct && !direct.includes('..')) keys.add(direct);
      else if (/<[a-z][\s\S]*>/i.test(value)) for (const key of keysFromHtml(value, baseUrl)) keys.add(key);
      return;
    }
    if (Array.isArray(value)) { value.forEach(walk); return; }
    if (value && typeof value === 'object') { Object.values(value).forEach(walk); }
  };
  walk(item);
  return [...keys];
}

export function keysToDelete(items, baseUrl) {
  const keys = new Set();
  for (const item of items || []) for (const key of keysFromItem(item, baseUrl)) keys.add(key);
  return [...keys].sort();
}
