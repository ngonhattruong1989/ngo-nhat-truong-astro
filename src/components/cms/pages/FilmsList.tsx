import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import LocaleTabs from '../LocaleTabs';
import { previewSrc, store, type Locale } from '../../../lib/cms/client';

export default function FilmsList() {
  const navigate = useNavigate();
  const [locale, setLocale] = useState<Locale>('vi');
  const [, force] = useState(0);
  const ids = store.ids('films');
  const present = Object.fromEntries(ids.map((id) => [id, Object.fromEntries(
    (['vi', 'en', 'fr'] as Locale[]).map((code) => [code, store.localesFor('films', id).includes(code)]),
  )]));

  async function create() {
    const title = window.prompt('Tên phim mới (sẽ tự sinh slug):');
    if (!title?.trim()) return;
    const id = store.newId('films', title);
    await store.createFilm(id, title.trim());
    navigate(`/films/${id}`);
  }

  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">Quản lý nội dung / Phim</div>
          <h1>Phim</h1>
          <p className="subtle">Mỗi phim là một block. Bấm vào block để sửa thông tin, media và credit.</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <LocaleTabs value={locale} onChange={(next) => { setLocale(next); force((n) => n + 1); }} />
          <button type="button" className="btn" onClick={() => void create()}>+ Thêm phim</button>
        </div>
      </div>

      <div className="grid-cards">
        {ids.map((id) => {
          const item = store.item('films', id, locale) || store.item('films', id, 'vi');
          const badges = (['vi', 'en', 'fr'] as Locale[]);
          return (
            <div className="tile tile-with-tools" key={id}>
              <Link to={`/films/${id}`} className="tile-link">
                <div className="tile-cover" style={{ backgroundImage: `url(${previewSrc(item?.poster || item?.thumbnail || '')})` }} />
                <div className="tile-body">
                  <div className="tile-title">{item?.title || id}</div>
                  <div className="tile-meta">{[item?.genre, item?.year].filter(Boolean).join(' · ') || '—'}</div>
                  <div className="badges">
                    {badges.map((code) => (
                      <span key={code} className={`badge ${present[id][code] ? '' : 'empty'}`}>{code.toUpperCase()}</span>
                    ))}
                  </div>
                </div>
              </Link>
              <div className="tile-tools">
                <button type="button" title="Lên" onClick={() => { void store.moveItem('films', locale, id, 'up').then(() => force((n) => n + 1)); }}>↑</button>
                <button type="button" title="Xuống" onClick={() => { void store.moveItem('films', locale, id, 'down').then(() => force((n) => n + 1)); }}>↓</button>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
