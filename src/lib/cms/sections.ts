export type SectionKind = 'canvas' | 'films' | 'home' | 'items' | 'translations';

export type SectionMeta = { label: string; kind: SectionKind; blurb: string };

export const SECTION_META: Record<string, SectionMeta> = {
  home: { label: 'Trang chủ', kind: 'home', blurb: 'Hero, logo, lời chào' },
  about: { label: 'Về tôi', kind: 'canvas', blurb: 'Canvas tự do, 3 ngôn ngữ' },
  films: { label: 'Phim', kind: 'films', blurb: 'Mỗi phim một block' },
  music: { label: 'Nhạc', kind: 'items', blurb: 'Playlist và bản thu' },
  paintings: { label: 'Tranh', kind: 'items', blurb: 'Tác phẩm và chất liệu' },
  poetry: { label: 'Thơ', kind: 'items', blurb: 'Bài thơ theo ngôn ngữ' },
  artwork: { label: 'Artwork', kind: 'items', blurb: 'Poster, thiết kế' },
  spaces: { label: 'Không gian', kind: 'items', blurb: 'Sắp đặt, nội thất' },
  blog: { label: 'Blog', kind: 'items', blurb: 'Ghi chép, bài viết' },
  contact: { label: 'Liên hệ', kind: 'canvas', blurb: 'Thông tin liên hệ' },
  'ui-translations': { label: 'Bản dịch giao diện', kind: 'translations', blurb: 'Menu, tagline, footer' },
};

export const SECTION_ORDER = [
  'home', 'about', 'films', 'music', 'paintings', 'poetry', 'artwork', 'spaces', 'blog', 'contact', 'ui-translations',
];

export const ITEM_SECTIONS = ['music', 'paintings', 'poetry', 'artwork', 'spaces', 'blog'];

// Khoá section trong CMS khác đường dẫn ngoài website ở hai chỗ này.
const SITE_PATH: Record<string, string> = { poetry: '/poets', spaces: '/space', home: '/' };

export function sitePathFor(section: string, id = ''): string {
  const base = SITE_PATH[section] || `/${section}`;
  return id ? `${base}/${id}` : base;
}
