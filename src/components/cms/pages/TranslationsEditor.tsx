import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import LocaleTabs from '../LocaleTabs';
import SaveBar from '../SaveBar';
import { store, type Dict, type Locale, type SectionPayload } from '../../../lib/cms/client';

type Status = { kind: 'ok' | 'error'; message: string } | null;

export default function TranslationsEditor() {
  const [locale, setLocale] = useState<Locale>('vi');
  const [data, setData] = useState<SectionPayload | null>(null);
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
    // Tagline + lời chào do trang chủ quản lý; vẫn giữ key để dữ liệu cũ không bị mất.
    const next = structuredClone(data) as SectionPayload;
    for (const code of ['vi', 'en', 'fr'] as Locale[]) {
      const entry = next[code] || ({} as Dict);
      next[code] = {
        tagline: entry.tagline || '',
        homeWelcome: entry.homeWelcome || '',
        menu: Array.isArray(entry.menu) ? entry.menu : [],
        footer: entry.footer || '',
        ...entry,
      };
    }
    await store.saveSection('ui-translations', next);
    setData(next);
    setSavedAt(new Date().toISOString());
    setStatus({ kind: 'ok', message: 'Đã lưu bản dịch giao diện.' });
    window.setTimeout(() => setStatus(null), 3500);
  }

  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow"><Link to="/">← Tổng quan</Link> / Bản dịch giao diện</div>
          <h1>Bản dịch giao diện</h1>
          <p className="subtle">Menu và footer cho từng ngôn ngữ.</p>
        </div>
        <LocaleTabs value={locale} onChange={setLocale} />
      </div>

      <section className="card">
        <h3 className="card-title">Tagline &amp; lời chào trang chủ</h3>
        <p className="subtle">
          Hai dòng này giờ thuộc trang chủ: sửa ở{' '}
          <Link to="/home" style={{ textDecoration: 'underline' }}>Trang chủ → Nhận diện / Lời chào</Link>{' '}
          để website cập nhật đúng. Ô cũ ở đây đã bỏ để không còn chỉnh nhầm chỗ.
        </p>
      </section>

      <section className="card">
        <div className="field">
          <label>Footer</label>
          <input className="input" value={payload.footer || ''} onChange={(event) => update({ footer: event.target.value })} />
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

      <SaveBar savedAt={savedAt} status={status} onSave={save} liveHref="/" />
    </>
  );
}
