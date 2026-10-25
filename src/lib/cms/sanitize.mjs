const ALLOWED_TAGS = new Set([
  'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'strike', 'h2', 'h3',
  'blockquote', 'ul', 'ol', 'li', 'a', 'img', 'figure', 'figcaption', 'hr', 'code', 'pre', 'span',
  'video', 'iframe',
]);
const VOID_TAGS = new Set(['br', 'hr', 'img']);
const ALLOWED_ATTRS = new Set(['href', 'src', 'poster', 'alt', 'title', 'class', 'target', 'rel', 'data-width', 'data-align']);
const URL_ATTRS = new Set(['href', 'src', 'poster']);
const VIDEO_ATTRS = new Set(['src', 'poster', 'preload', 'width', 'height', 'class', 'style']);
const VIDEO_BOOLEAN_ATTRS = new Set(['controls', 'loop', 'muted', 'playsinline', 'autoplay']);
const STYLE_PROPS = new Set([
  'font-size', 'font-weight', 'font-style', 'text-align', 'text-decoration',
  'line-height', 'margin-bottom', 'margin-top',
  // Khung hiển thị của ảnh (rộng bao nhiêu %, canh lề nào).
  'width', 'max-width', 'height', 'margin-left', 'margin-right', 'display',
]);
// Các thuộc tính hình học phải đúng dạng số/đơn vị, không nhận biểu thức CSS.
const STYLE_VALUES = {
  width: /^(?:\d{1,3}(?:\.\d+)?%|\d{1,4}px|auto)$/,
  'max-width': /^(?:\d{1,3}(?:\.\d+)?%|\d{1,4}px|none)$/,
  height: /^(?:\d{1,4}px|auto)$/,
  'margin-left': /^(?:auto|-?\d{1,4}(?:\.\d+)?(?:px|%))$/,
  'margin-right': /^(?:auto|-?\d{1,4}(?:\.\d+)?(?:px|%))$/,
  display: /^(?:block|inline-block|inline)$/,
};
const SAFE_SCHEMES = new Set(['http', 'https', 'mailto', 'tel']);
const YOUTUBE_EMBED = /^https:\/\/(?:www\.)?(?:youtube\.com|youtube-nocookie\.com)\/embed\/[A-Za-z0-9_-]{6,20}(?:\?[A-Za-z0-9_=&%.-]*)?$/;
const DROP_WITH_CONTENT = /<(script|style|object|embed|noscript|template)\b[\s\S]*?<\/\1>/gi;

function escapeText(text) {
  return String(text)
    .replace(/&(?![a-zA-Z#0-9]+;)/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeAttr(value) {
  return String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Cho phép URL tuyệt đối (https/http/mailto/tel) và đường dẫn tương đối; chặn mọi scheme khác.
function safeUrl(value) {
  const url = String(value || '').trim();
  if (!url) return '';
  if (/[\u0000-\u001f]/.test(url)) return '';
  const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(url);
  if (scheme && !SAFE_SCHEMES.has(scheme[1].toLowerCase())) return '';
  return url;
}

// Video/poster chỉ https hoặc đường dẫn nội bộ (chặn http mixed-content và data:).
function safeMediaUrl(value) {
  const url = String(value || '').trim();
  return /^(https:\/\/|\/)/i.test(url) ? url : '';
}

function safeStyle(value) {
  return String(value || '')
    .split(';')
    .map((decl) => {
      const idx = decl.indexOf(':');
      if (idx === -1) return '';
      const prop = decl.slice(0, idx).trim().toLowerCase();
      const val = decl.slice(idx + 1).trim();
      if (!STYLE_PROPS.has(prop)) return '';
      if (/url\s*\(|expression\s*\(|javascript:|@import/i.test(val)) return '';
      const pattern = STYLE_VALUES[prop];
      if (pattern && !pattern.test(val)) return '';
      return `${prop}: ${val}`;
    })
    .filter(Boolean)
    .join('; ');
}

function parseAttributes(source) {
  const pairs = [];
  const attrRe = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*(?:=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g;
  let raw;
  while ((raw = attrRe.exec(source || '')) !== null) {
    pairs.push([raw[1].toLowerCase(), raw[2] ?? raw[3] ?? raw[4] ?? '']);
  }
  return pairs;
}

export function sanitizeHtml(html, { allowImages = true } = {}) {
  if (typeof html !== 'string' || html.trim() === '') return '';
  const source = html.replace(/<!--[\s\S]*?-->/g, '').replace(DROP_WITH_CONTENT, '');
  const out = [];
  const tagRe = /<\/?([a-zA-Z][a-zA-Z0-9-]*)((?:"[^"]*"|'[^']*'|[^>"'])*)>/g;
  let last = 0;
  let match;
  while ((match = tagRe.exec(source)) !== null) {
    out.push(escapeText(source.slice(last, match.index)));
    last = tagRe.lastIndex;
    const name = match[1].toLowerCase();
    const isClosing = match[0].startsWith('</');
    if (!ALLOWED_TAGS.has(name) || (name === 'img' && !allowImages)) continue;
    if (isClosing) {
      if (!VOID_TAGS.has(name) && name !== 'iframe') out.push(`</${name}>`);
      continue;
    }

    const pairs = parseAttributes(match[2]);

    if (name === 'iframe') {
      const src = pairs.find(([attr]) => attr === 'src')?.[1] || '';
      if (!YOUTUBE_EMBED.test(src.trim())) continue;
      out.push(`<iframe src="${escapeAttr(src.trim())}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen loading="lazy" referrerpolicy="strict-origin-when-cross-origin"></iframe>`);
      continue;
    }

    if (name === 'video') {
      const pieces = [];
      for (const [attr, value] of pairs) {
        if (VIDEO_BOOLEAN_ATTRS.has(attr)) { pieces.push(attr); continue; }
        if (attr === 'style') {
          const style = safeStyle(value);
          if (style) pieces.push(`style="${escapeAttr(style)}"`);
          continue;
        }
        if (!VIDEO_ATTRS.has(attr)) continue;
        if (attr === 'src' || attr === 'poster') {
          const url = safeMediaUrl(value);
          if (url) pieces.push(`${attr}="${escapeAttr(url)}"`);
          continue;
        }
        pieces.push(`${attr}="${escapeAttr(value)}"`);
      }
      out.push(`<video${pieces.length ? ` ${pieces.join(' ')}` : ''}>`);
      continue;
    }

    const attrs = new Map();
    for (const [attr, value] of pairs) {
      if (attr === 'style') {
        const style = safeStyle(value);
        if (style) attrs.set('style', style);
        continue;
      }
      if (!ALLOWED_ATTRS.has(attr)) continue;
      if (URL_ATTRS.has(attr)) {
        const url = safeUrl(value);
        if (url) attrs.set(attr, url);
        continue;
      }
      if (name === 'a' && attr === 'target') attrs.set('target', '_blank');
      else attrs.set(attr, value);
    }
    if (attrs.has('target')) attrs.set('rel', 'noopener noreferrer');
    const rendered = [...attrs].map(([key, value]) => ` ${key}="${escapeAttr(value)}"`).join('');
    out.push(`<${name}${rendered}>`);
  }
  out.push(escapeText(source.slice(last)));
  return out.join('').trim();
}
