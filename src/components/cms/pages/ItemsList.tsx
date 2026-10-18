import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import LocaleTabs from '../LocaleTabs';
import DeleteTileButton from '../DeleteTileButton';
import { previewSrc, store, type Locale } from '../../../lib/cms/client';
import { SECTION_META } from '../../../lib/cms/sections';

export default function ItemsList() {
  const { section = '' } = useParams();
  const navigate = useNavigate();
  const [locale, setLocale] = useState<Locale>('vi');
  const [, force] = useState(0);
  const meta = SECTION_META[section];
  const ids = store.ids(section);

  if (!meta || meta.kind !== 'items') {
    return <section className="card">Trang không tồn tại. <Link to="/">Về tổng quan</Link></section>;
  }

  async function create() {
    const title = window.prompt(`Tên mục mới cho ${meta.label}:`);
    if (!title?.trim()) return;
    const id = store.newId(section, title);
    await store.createItem(section, id, title.trim());
    navigate(`/${section}/${id}`);
  }

  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow"><Link to="/">← Tổng quan</Link> / {meta.label}</div>
          <h1>{meta.label}</h1>
          <p className="subtle">Mỗi mục là một block. Bấm vào block để sửa nội dung trong canvas và preview.</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <LocaleTabs value={locale} onChange={(next) => { setLocale(next); force((n) => n + 1); }} />
          <button type="button" className="btn" onClick={() => void create()}>+ Thêm mục</button>
        </div>
      </div>

      <div className="grid-cards">
        {ids.map((id) => {
          const item = store.item(section, id, locale) || store.item(section, id, 'vi') || {};
          const locales = store.localesFor(section, id);
          return (
            <div className="tile tile-with-tools" key={id}>
              <Link to={`/${section}/${id}`} className="tile-link">
                <div className="tile-cover" style={{ backgroundImage: `url(${previewSrc(item.thumbnail || '')})` }}>
                  {item.thumbnail ? '' : (item.title || id).slice(0, 22)}
                </div>
                <div className="tile-body">
                  <div className="tile-title">{item.title || id}</div>
                  <div className="tile-meta">{item.date || item.medium || '—'}</div>
                  <div className="badges">
                    {(['vi', 'en', 'fr'] as Locale[]).map((code) => (
                      <span key={code} className={`badge ${locales.includes(code) ? '' : 'empty'}`}>{code.toUpperCase()}</span>
                    ))}
                  </div>
                </div>
              </Link>
              <div className="tile-tools">
                <button type="button" title="Lên" onClick={() => { void store.moveItem(section, locale, id, 'up').then(() => force((n) => n + 1)); }}>↑</button>
                <button type="button" title="Xuống" onClick={() => { void store.moveItem(section, locale, id, 'down').then(() => force((n) => n + 1)); }}>↓</button>
                <DeleteTileButton section={section} id={id} title={item.title || id} onDeleted={() => force((n) => n + 1)} />
              </div>
            </div>
          );
        })}
      </div>
      {ids.length === 0 ? <p className="subtle">Chưa có mục nào trong {meta.label}.</p> : null}
    </>
  );
}
