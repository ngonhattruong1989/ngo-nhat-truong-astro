import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import LocaleTabs from '../LocaleTabs';
import DeleteTileButton from '../DeleteTileButton';
import SectionSettings from '../SectionSettings';
import RolePagesSettings from '../RolePagesSettings';
import { previewSrc, store, type Locale } from '../../../lib/cms/client';
import { FILM_ROLES, normalizeRoles, roleLabel } from '../../../lib/cms/roles.mjs';

type Filter = '' | 'unassigned' | (typeof FILM_ROLES)[number];

export default function FilmsList() {
  const navigate = useNavigate();
  const [locale, setLocale] = useState<Locale>('vi');
  const [filter, setFilter] = useState<Filter>('');
  const [, force] = useState(0);

  const allIds = store.ids('films');
  const items = allIds.map((id) => {
    const item = store.item('films', id, locale) || store.item('films', id, 'vi') || {};
    return { id, item, roles: normalizeRoles(item.roles) };
  });
  const counts = {
    all: items.length,
    actor: items.filter((entry) => entry.roles.includes('actor')).length,
    'production-designer': items.filter((entry) => entry.roles.includes('production-designer')).length,
    unassigned: items.filter((entry) => entry.roles.length === 0).length,
  };
  const visible = items.filter((entry) => {
    if (filter === 'unassigned') return entry.roles.length === 0;
    if (filter) return entry.roles.includes(filter);
    return true;
  });
  const present = Object.fromEntries(allIds.map((id) => [id, Object.fromEntries(
    (['vi', 'en', 'fr'] as Locale[]).map((code) => [code, store.localesFor('films', id).includes(code)]),
  )]));

  async function create() {
    const role = filter && filter !== 'unassigned' ? filter : '';
    const title = window.prompt(`Tên phim mới${role ? ` (sẽ vào trang ${roleLabel(role, 'vi')})` : ''}:`);
    if (!title?.trim()) return;
    const id = store.newId('films', title);
    await store.createFilm(id, title.trim(), role ? [role] : []);
    navigate(`/films/${id}`);
  }

  const tabs: { id: Filter; label: string; count: number }[] = [
    { id: '', label: 'Tất cả', count: counts.all },
    { id: 'actor', label: roleLabel('actor', 'vi'), count: counts.actor },
    { id: 'production-designer', label: roleLabel('production-designer', 'vi'), count: counts['production-designer'] },
    { id: 'unassigned', label: roleLabel('unassigned', 'vi'), count: counts.unassigned },
  ];

  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">Quản lý nội dung / Phim</div>
          <h1>Phim</h1>
          <p className="subtle">Vai trò của phim quyết định nó nằm ở trang «diễn viên» hay «production designer» ngoài website.</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <LocaleTabs value={locale} onChange={(next) => { setLocale(next); force((n) => n + 1); }} />
          <button type="button" className="btn" onClick={() => void create()}>+ Thêm phim</button>
        </div>
      </div>

      <div className="role-filters">
        {tabs.map((tab) => (
          <button
            key={tab.id || 'all'}
            type="button"
            className={`chip ${filter === tab.id ? 'chip-active' : ''}`}
            onClick={() => setFilter(tab.id)}
          >
            {tab.label} <span className="chip-count">{tab.count}</span>
          </button>
        ))}
        <span className="subtle">
          {filter === 'unassigned'
            ? 'Gán vai trò bằng checkbox trong từng phim.'
            : filter
              ? `Đang xem phim có vai trò ${roleLabel(filter, 'vi')}.`
              : 'Bấm một vai trò để lọc danh sách.'}
        </span>
      </div>

      <SectionSettings section="films" locale={locale} showLayout={false} />

      <div className="grid-cards">
        {visible.map(({ id, item, roles }) => (
          <div className="tile tile-with-tools" key={id}>
            <Link to={`/films/${id}`} className="tile-link">
              <div className="tile-cover" style={{ backgroundImage: `url(${previewSrc(item?.poster || item?.thumbnail || '')})` }} />
              <div className="tile-body">
                <div className="tile-title">{item?.title || id}</div>
                <div className="tile-meta">{[item?.genre, item?.year].filter(Boolean).join(' · ') || '—'}</div>
                <div className="badges">
                  {roles.length === 0 ? (
                    <span className="badge empty">{roleLabel('unassigned', 'vi')}</span>
                  ) : roles.map((role) => (
                    <span key={role} className="badge">{roleLabel(role, 'vi')}</span>
                  ))}
                  {(['vi', 'en', 'fr'] as Locale[]).map((code) => (
                    <span key={code} className={`badge ${present[id]?.[code] ? '' : 'empty'}`}>{code.toUpperCase()}</span>
                  ))}
                </div>
              </div>
            </Link>
            <div className="tile-tools">
              <button type="button" title="Lên" onClick={() => { void store.moveItem('films', locale, id, 'up').then(() => force((n) => n + 1)); }}>↑</button>
              <button type="button" title="Xuống" onClick={() => { void store.moveItem('films', locale, id, 'down').then(() => force((n) => n + 1)); }}>↓</button>
              <DeleteTileButton section="films" id={id} title={item?.title || id} onDeleted={() => force((n) => n + 1)} />
            </div>
          </div>
        ))}
      </div>

      {visible.length === 0 ? (
        <p className="subtle">
          {filter === 'unassigned'
            ? 'Mọi phim đều đã có vai trò.'
            : filter
              ? `Chưa có phim nào ở vai trò ${roleLabel(filter, 'vi')}.`
              : 'Chưa có phim nào.'}
        </p>
      ) : null}

      <RolePagesSettings locale={locale} />
    </>
  );
}
