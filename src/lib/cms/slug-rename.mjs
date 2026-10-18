// Đổi slug của một mục = đổi folder R2 của nó. Module này rewrite mọi URL media
// thuộc domain của mình bên trong item và trả về danh sách key đã "chuyển nhà".
// URL ngoài (cdn khác) không bị chạm tới.

const DEFAULT_BASE = 'https://public.ngonhattruong.com';
const URL_RE = /(?:https?:\/\/[^\s"'<>]+|\/(?!\/)[^\s"'<>]*)/g;

export function mediaPrefixFor(section, id) {
  return section === 'films' ? `films/${id}/` : `${section}/${id}/`;
}

function isOwnedUrl(url, baseUrl) {
  return url.startsWith(`${baseUrl}/`) || url.startsWith('/media/') || url.startsWith('/');
}

function keyAt(text, prefix) {
  const index = text.indexOf(prefix);
  if (index < 0) return '';
  const rest = text.slice(index + prefix.length);
  const stop = rest.search(/["'\s)]/);
  return `${prefix}${stop === -1 ? rest : rest.slice(0, stop)}`;
}

export function rewriteItem(item, section, fromId, toId, baseUrl = DEFAULT_BASE) {
  const from = mediaPrefixFor(section, fromId);
  const to = mediaPrefixFor(section, toId);
  const moved = new Set();

  const rewriteString = (value) => {
    if (!value.includes(from)) return value;

    // Key trần (không scheme, không dấu / ): ví dụ "films/phuc-sinh/poster/a.jpg".
    if (value.startsWith(from)) {
      const next = `${to}${value.slice(from.length)}`;
      filedKey(next, to, moved);
      return next;
    }

    return value.replace(URL_RE, (url) => {
      if (!url.includes(from) || !isOwnedUrl(url, baseUrl)) return url;
      const next = url.split(from).join(to);
      filedKey(next, to, moved);
      return next;
    });
  };

  const walk = (value) => {
    if (typeof value === 'string') return rewriteString(value);
    if (Array.isArray(value)) return value.map(walk);
    if (value && typeof value === 'object') {
      const out = {};
      for (const [key, child] of Object.entries(value)) out[key] = walk(child);
      return out;
    }
    return value;
  };

  return { item: walk(item), movedKeys: [...moved] };
}

function filedKey(text, prefix, moved) {
  const key = keyAt(text, prefix);
  if (key) moved.add(key);
}
