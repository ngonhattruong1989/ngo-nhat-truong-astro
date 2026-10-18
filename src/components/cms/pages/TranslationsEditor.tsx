import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import LocaleTabs from '../LocaleTabs';
import SaveBar from '../SaveBar';
import { store, type Dict, type Locale } from '../../../lib/cms/client';

type Status = { kind: 'ok' | 'error'; message: string } | null;

export default function TranslationsEditor() {
  const [locale, setLocale] = useState<Locale>('vi');
  const [data, setData] = useState<Record<string, Dict> | null>(null);
  const [status, setStatus] = useState<Status>(null);
  const [savedAt, setSavedAt] = useState('');

  useEffect(() => {
    setData(store.get('ui-translations'));
  }, []);

  if (!data) return null;
  const payload = data[locale] || { tagline: '', menu: [], footer: '', homeWelcome: '' };

  function update(patch: Dict) {
    setData((current) => (current ? { ...current, [locale]: { ...current[locale], ...patch } } : current));
  }

  async function save() {
    if (!data) return;
    await store.saveSection('ui-translations', data);
    setSavedAt(new Date().toISOString());
    setStatus({ kind: 'ok', message: 'Đã lưu bản dịch giao diện (mock).' });
    window.setTimeout(() => setStatus(null), 3500);
  }

  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow"><Link to="/">← Tổng quan</Link> / Bản dịch giao diện</div>
          <h1>Bản dịch giao diện</h1>
          <p className="subtle">Menu, tagline, footer và lời chào trang chủ cho từng ngôn ngữ.</p>
        </div>
        <LocaleTabs value={locale} onChange={setLocale} />
      </div>

      <section className="card">
        <div className="row-2">
          <div className="field">
            <label>Tagline</label>
            <input className="input" value={payload.tagline || ''} onChange={(event) => update({ tagline: event.target.value })} />
          </div>
          <div className="field">
            <label>Footer</label>
            <input className="input" value={payload.footer || ''} onChange={(event) => update({ footer: event.target.value })} />
          </div>
        </div>
        <div className="field">
          <label>Lời chào trang chủ</label>
          <textarea className="textarea" rows={3} value={payload.homeWelcome || ''} onChange={(event) => update({ homeWelcome: event.target.value })} />
        </div>
        <div className="field">
          <label>Menu (10 mục, theo thứ tự ngoài website)</label>
          <div className="menu-grid">
            {(payload.menu || []).map((label: string, index: number) => (
              <input
                key={index}
                className="input"
                value={label}
                onChange={(event) => {
                  const menu = [...(payload.menu || [])];
                  menu[index] = event.target.value;
                  update({ menu });
                }}
              />
            ))}
          </div>
        </div>
      </section>

      <SaveBar savedAt={savedAt} status={status} onSave={save} liveHref="http://localhost:4321" />
    </>
  );
}
