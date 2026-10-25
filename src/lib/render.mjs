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

// Ảnh trong canvas: cỡ khung do CMS đặt (xem image-box.mjs), ảnh cũ mặc định 100%.
export function imageBoxStyleAttr(style) {
  return style ? ` style="${escapeHtml(style)}"` : '';
}

function galleryHTML(label, list) {
  if (!Array.isArray(list) || list.length === 0) return '';
  return `<section class="bts-section"><h3>${escapeHtml(label)}</h3><div class="bts-grid">${list
    .map((src) => `<img src="${escapeHtml(src)}" alt="" loading="lazy">`)
    .join('')}</div></section>`;
}

const COLLAGE_SECTIONS = new Set(['paintings', 'artwork']);
const META_LABELS = {
  vi: { medium: 'Chất liệu', date: 'Ngày' },
  en: { medium: 'Medium', date: 'Date' },
  fr: { medium: 'Matériau', date: 'Date' },
};

// Mục của trang collage (Tranh, Artwork): ảnh + thông tin như panel lightbox ngoài website.
export function previewCollageItemHTML({ item, locale = 'vi' }) {
  if (!item) return '';
  const labels = META_LABELS[locale] || META_LABELS.vi;
  const images = Array.isArray(item.images) && item.images.length
    ? item.images.filter(Boolean)
    : (item.thumbnail ? [item.thumbnail] : []);
  return `<div class="preview-painting">
    <div class="preview-painting-media">${images.length
      ? images.map((src) => `<img src="${escapeHtml(src)}" alt="">`).join('')
      : '<div class="preview-painting-empty">Chưa có ảnh</div>'}</div>
    <div class="preview-painting-info">
      <h2>${escapeHtml(item.title || '')}</h2>
      <div class="preview-painting-meta">
        ${item.medium ? `<div><span>${labels.medium}</span><strong>${escapeHtml(item.medium)}</strong></div>` : ''}
        ${item.date ? `<div><span>${labels.date}</span><strong>${escapeHtml(item.date)}</strong></div>` : ''}
      </div>
      ${item.description ? `<div class="preview-painting-desc">${item.description}</div>` : ''}
    </div>
  </div>`;
}

// Chi tiết một mục, dùng đúng class của website thật (global.css) để preview không lệch.
export function previewItemHTML({ section, item, locale = 'vi' }) {
  if (!item) return '';
  if (COLLAGE_SECTIONS.has(section)) return previewCollageItemHTML({ item, locale });
  const isFilm = section === 'films';
  const meta = isFilm
    ? [item.genre, item.year, item.duration].filter(Boolean).join(' · ')
    : [item.date, item.medium].filter(Boolean).join(' · ');

  if (isFilm) {
    return `<div class="film-detail-view">
      <h2>${escapeHtml(item.title || '')}</h2>
      ${meta ? `<div class="film-meta">${meta.split(' · ').map((part) => `<span class="meta-line">${escapeHtml(part)}</span>`).join('')}</div>` : ''}
      ${filmVideoHTML(item) ? `<div class="video-wrapper-limit"><div class="video-container">${filmVideoHTML(item)}</div></div>` : ''}
      ${item.poster ? `<div style="text-align:center;margin:20px 0 40px"><img src="${escapeHtml(item.poster)}" alt="" style="max-width:300px;width:100%;height:auto;border-radius:2px"></div>` : ''}
      ${galleryHTML('Still', item.stills)}
      ${item.crew ? `<div class="crew-section"><h3>Crew</h3><ul class="crew-list">${item.crew}</ul></div>` : ''}
      ${galleryHTML('Behind The Scene', item.bts)}
    </div>`;
  }

  return `<div class="film-detail-view">
    <h2>${escapeHtml(item.title || '')}</h2>
    ${meta ? `<div class="film-meta"><span class="meta-line">${escapeHtml(meta)}</span></div>` : ''}
    ${item.thumbnail ? `<div style="margin-bottom:30px"><img src="${escapeHtml(item.thumbnail)}" alt="" style="max-width:100%;height:auto;border-radius:2px"></div>` : ''}
    ${item.excerpt ? `<p style="font-style:italic;margin-bottom:20px;color:#555">${escapeHtml(item.excerpt)}</p>` : ''}
    ${bodyHtml(item)}
    ${Array.isArray(item.images) && item.images.length ? galleryHTML('Bộ ảnh', item.images) : ''}
  </div>`;
}

// Một trang danh sách (grid / collage / list) — cùng markup với renderer ngoài website.
export function previewSectionHTML({ title, description, layout = 'grid', items = [] }) {
  const list = Array.isArray(items) ? items : [];
  const head = `<h2>${escapeHtml(title || '')}</h2>${description ? `<p class="dynamic-desc">${description}</p>` : ''}`;

  if (layout === 'collage') {
    const cards = list.map((item) => (item.thumbnail
      ? `<div class="collage-item"><img src="${escapeHtml(item.thumbnail)}" alt="${escapeHtml(item.title || '')}" loading="lazy"><div class="collage-overlay"><span class="collage-label">${escapeHtml(item.title || '')}</span></div></div>`
      : `<div class="collage-item-text"><div class="collage-text-title">${escapeHtml(item.title || '')}</div>${item.medium ? `<div class="collage-text-medium">${escapeHtml(item.medium)}</div>` : ''}${item.date ? `<div class="collage-text-date">${escapeHtml(item.date)}</div>` : ''}</div>`)).join('');
    return `<div class="dynamic-content">${head}<div class="collage-grid">${cards}</div></div>`;
  }

  if (layout === 'grid') {
    const cards = list.map((item) => (item.thumbnail
      ? `<div class="gallery-item"><img src="${escapeHtml(item.thumbnail)}" alt="${escapeHtml(item.title || '')}"><div class="gallery-title">${escapeHtml(item.title || '')}</div></div>`
      : `<div class="gallery-item gallery-item-text"><div class="gallery-text-card"><div class="gallery-text-title">${escapeHtml(item.title || '')}</div>${item.date ? `<div class="gallery-text-date">${escapeHtml(item.date)}</div>` : ''}${item.excerpt ? `<div class="gallery-text-excerpt">${escapeHtml(item.excerpt)}</div>` : ''}</div><div class="gallery-title">${escapeHtml(item.title || '')}</div></div>`)).join('');
    return `<div class="dynamic-content">${head}<div class="gallery-grid">${cards}</div></div>`;
  }

  const cards = list.map((item) => `<div class="item-card">
      ${(item.title || item.date) ? `<div class="item-header"><span class="item-title">${escapeHtml(item.title || '')}</span>${item.date ? `<span class="item-date"> — ${escapeHtml(item.date)}</span>` : ''}</div>` : ''}
      <div class="item-body">${item.excerpt ? `<p><strong>${escapeHtml(item.excerpt)}</strong></p>` : ''}${bodyHtml(item)}</div>
    </div>`).join('');
  return `<div class="dynamic-content">${head}<div class="items-list">${cards || '<p><em>(Nội dung đang được cập nhật...)</em></p>'}</div></div>`;
}

export function previewCanvasHTML({ title, html }) {
  return `<div class="dynamic-content"><h2>${escapeHtml(title || '')}</h2><div class="rich">${html || ''}</div></div>`;
}

export function previewHomeHTML(payload = {}) {
  const hero = Array.isArray(payload.heroImages) && payload.heroImages.length ? payload.heroImages : [];
  return `<div class="dynamic-content">
    <header class="header" style="border:0;padding:0 0 30px">
      <div class="brand">
        ${payload.logo ? `<div class="brand-logo"><img class="logo-image" src="${escapeHtml(payload.logo)}" alt=""></div>` : ''}
        <p class="tagline">${escapeHtml(payload.tagline || '')}</p>
      </div>
    </header>
    <div class="hero-slider">
      <div class="slides-container">
        ${hero.map((src, index) => `<img src="${escapeHtml(src)}" class="${index === 0 ? 'slide active' : 'slide'}" alt="">`).join('') || '<div class="slide active" style="background:#f0f0f0"></div>'}
      </div>
    </div>
    <div class="intro-text"><p>${escapeHtml(payload.intro || '')}</p></div>
  </div>`;
}

// Bộ render dùng chung cho trang preview của CMS: chọn đúng khối theo section.
export function previewPageHTML({ section, payload = {}, itemId = '', locale = 'vi' }) {
  if (section === 'home') return previewHomeHTML(payload);
  if (itemId) {
    const item = (payload.items || []).find((entry) => entry?.id === itemId);
    return item ? previewItemHTML({ section, item, locale }) : '';
  }
  if (typeof payload.html === 'string') return previewCanvasHTML(payload);
  return previewSectionHTML({
    title: payload.title,
    description: payload.description,
    layout: payload.layout,
    items: payload.items,
  });
}
