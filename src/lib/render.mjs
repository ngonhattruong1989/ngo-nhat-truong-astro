export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Nội dung của một item: ưu tiên `html` (canvas mới), fallback `description`/`content` cũ.
export function bodyHtml(item) {
  if (!item) return '';
  if (typeof item.html === 'string' && item.html.trim()) return item.html;
  const raw = item.description ?? item.content ?? '';
  if (typeof raw !== 'string' || !raw.trim()) return '';
  if (/<[a-z][\s\S]*>/i.test(raw)) return raw;
  return `<div class="rich-plain">${escapeHtml(raw).replace(/\n/g, '<br>')}</div>`;
}

export function filmVideoHTML(film) {
  if (film?.videoUrl) {
    return `<video src="${escapeHtml(film.videoUrl)}" controls playsinline preload="metadata" style="width:100%;height:auto;border-radius:2px"></video>`;
  }
  if (film?.youtubeId) {
    return `<iframe src="https://www.youtube.com/embed/${escapeHtml(film.youtubeId)}" frameborder="0" allowfullscreen></iframe>`;
  }
  return '';
}

function galleryHTML(label, list) {
  if (!Array.isArray(list) || list.length === 0) return '';
  return `<section class="preview-gallery"><h3>${escapeHtml(label)}</h3><div class="preview-gallery-grid">${list
    .map((src) => `<img src="${escapeHtml(src)}" alt="" loading="lazy">`)
    .join('')}</div></section>`;
}

// Dùng cho trang preview trong CMS; cùng typography với site thật.
export function previewItemHTML({ section, item }) {
  if (!item) return '';
  const isFilm = section === 'films';
  const meta = isFilm
    ? [item.genre, item.year, item.duration].filter(Boolean).join(' · ')
    : [item.date, item.medium].filter(Boolean).join(' · ');
  const body = isFilm ? (item.crew || '') : bodyHtml(item);
  return `<article class="preview-article">
    <h1>${escapeHtml(item.title || '')}</h1>
    ${meta ? `<p class="preview-meta">${escapeHtml(meta)}</p>` : ''}
    ${isFilm && filmVideoHTML(item) ? `<div class="preview-video">${filmVideoHTML(item)}</div>` : ''}
    ${!isFilm && item.thumbnail ? `<img class="preview-poster" src="${escapeHtml(item.thumbnail)}" alt="">` : ''}
    ${isFilm && item.poster ? `<img class="preview-poster" src="${escapeHtml(item.poster)}" alt="">` : ''}
    ${body ? `<div class="rich">${body}</div>` : ''}
    ${isFilm ? galleryHTML('Still', item.stills) : ''}
    ${isFilm ? galleryHTML('Behind The Scene', item.bts) : ''}
    ${Array.isArray(item.images) && item.images.length ? galleryHTML('Bộ ảnh', item.images) : ''}
  </article>`;
}
