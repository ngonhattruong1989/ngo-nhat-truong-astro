// Vai trò của một dự án phim: quyết định dự án nằm ở trang nào ngoài website.
// Một dự án có thể có cả hai vai trò; không chọn gì = "chưa gán" (chỉ nằm ở /films).

export const FILM_ROLES = ['actor', 'production-designer'];

export const ROLE_LABELS = {
  vi: { actor: 'Diễn viên', 'production-designer': 'Production designer', unassigned: 'Chưa gán vai trò' },
  en: { actor: 'Actor', 'production-designer': 'Production designer', unassigned: 'No role yet' },
  fr: { actor: 'Acteur', 'production-designer': 'Production designer', unassigned: 'Rôle non défini' },
};

export function roleLabel(role, locale = 'vi') {
  const labels = ROLE_LABELS[locale] || ROLE_LABELS.vi;
  return labels[role] || role;
}

export function normalizeRoles(value) {
  if (!Array.isArray(value)) return [];
  const picked = [];
  for (const role of value) {
    if (FILM_ROLES.includes(role) && !picked.includes(role)) picked.push(role);
  }
  return FILM_ROLES.filter((role) => picked.includes(role));
}

export function hasRole(item, role) {
  return normalizeRoles(item?.roles).includes(role);
}

export function filterByRole(items, role) {
  const list = Array.isArray(items) ? items : [];
  return role ? list.filter((item) => hasRole(item, role)) : list;
}

// /films/<role> và /films/<role>/<id>; /films/<id> vẫn là deep link cũ, không có vai trò.
export function filmPath({ role = '', id = '' } = {}) {
  if (role && !FILM_ROLES.includes(role)) role = '';
  if (role && id) return `/films/${role}/${id}`;
  if (role) return `/films/${role}`;
  if (id) return `/films/${id}`;
  return '/films';
}

export function parseFilmPath(pathname) {
  const parts = String(pathname || '').split('/').filter(Boolean);
  if (parts[0] !== 'films') return null;
  if (FILM_ROLES.includes(parts[1])) {
    return { role: parts[1], id: parts[2] || '' };
  }
  return { role: '', id: parts[1] || '' };
}

// Copy mặc định cho 2 trang vai trò (tác giả sửa lại trong CMS › Phim).
export const ROLE_PAGE_DEFAULTS = {
  vi: {
    actor: { title: 'diễn viên', description: 'Những bộ phim Trường tham gia với vai trò diễn viên.' },
    'production-designer': { title: 'production designer', description: 'Những bộ phim Trường thiết kế mỹ thuật và bối cảnh.' },
  },
  en: {
    actor: { title: 'actor', description: 'Films Trường performed in.' },
    'production-designer': { title: 'production designer', description: 'Films Trường designed.' },
  },
  fr: {
    actor: { title: 'acteur', description: 'Films dans lesquels Trường a joué.' },
    'production-designer': { title: 'production designer', description: 'Films que Trường a conçus.' },
  },
};

// Nhãn menu thay cho mục "phim" cũ; thứ tự menu ngoài website phải khớp mảng này.
export const MENU_ROLE_LABELS = {
  vi: ['diễn viên', 'production designer'],
  en: ['actor', 'production designer'],
  fr: ['acteur', 'production designer'],
};

// Nhãn một mục "phim" duy nhất trên menu (trang Phim chứa cả 2 nhóm vai trò).
export const FILMS_MENU_LABEL = { vi: 'phim', en: 'films', fr: 'films' };

// Nhãn cho nhóm phim chưa gán vai trò, hiện ở cuối trang Phim.
export const UNASSIGNED_LABEL = { vi: 'khác', en: 'other', fr: 'autres' };

// Chia phim thành 2 nhóm vai trò (+ nhóm chưa gán) theo đúng thứ tự cố định.
export function groupFilmsByRole(items) {
  const list = Array.isArray(items) ? items : [];
  return {
    groups: FILM_ROLES.map((role) => ({ role, items: list.filter((item) => hasRole(item, role)) })),
    unassigned: list.filter((item) => normalizeRoles(item.roles).length === 0),
  };
}

// Gộp 2 mục vai trò trong menu về lại một mục "phim" (idempotent).
export function collapseMenu(menu, locale = 'vi') {
  const list = Array.isArray(menu) ? [...menu] : [];
  const labels = MENU_ROLE_LABELS[locale] || MENU_ROLE_LABELS.vi;
  const index = list.findIndex((entry, position) =>
    position >= 2 && entry === labels[0] && list[position + 1] === labels[1]);
  if (index < 0) return list;
  const next = [...list];
  next.splice(index, 2, FILMS_MENU_LABEL[locale] || FILMS_MENU_LABEL.vi);
  return next;
}

// Thêm `roles` cho mọi phim + copy 2 trang vai trò (idempotent).
export function ensureFilmRoles(section) {
  const next = structuredClone(section);
  for (const locale of Object.keys(next)) {
    const payload = next[locale];
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) continue;
    if (Array.isArray(payload.items)) {
      payload.items = payload.items.map((item) => ({ ...item, roles: normalizeRoles(item.roles) }));
    }
    const defaults = ROLE_PAGE_DEFAULTS[locale] || ROLE_PAGE_DEFAULTS.vi;
    const pages = payload.rolePages && typeof payload.rolePages === 'object' ? payload.rolePages : {};
    const rolePages = {};
    for (const role of FILM_ROLES) {
      rolePages[role] = {
        title: pages[role]?.title || defaults[role].title,
        description: pages[role]?.description ?? defaults[role].description,
      };
    }
    payload.rolePages = rolePages;
  }
  return next;
}

// Mảng menu cũ có 10 mục; thay "phim" bằng 2 mục vai trò (idempotent).
export function expandMenu(menu, locale = 'vi') {
  const list = Array.isArray(menu) ? [...menu] : [];
  const labels = MENU_ROLE_LABELS[locale] || MENU_ROLE_LABELS.vi;
  if (list.includes(labels[0]) && list.includes(labels[1])) return list;
  const next = [...list];
  const at = next.length > 2 ? 2 : next.length;
  next.splice(at, next.length > 2 ? 1 : 0, ...labels);
  return next;
}

// Tiêu đề/mô tả của trang vai trò: ưu tiên copy riêng, fallback về copy của trang phim.
export function rolePageCopy(payload, role) {
  const page = (payload?.rolePages && payload.rolePages[role]) || {};
  return {
    title: page.title || payload?.title || '',
    description: page.description ?? payload?.description ?? '',
  };
}
