import { useEffect, useState } from 'react';
import { store, type Locale } from '../../lib/cms/client';

type Status = { kind: 'ok' | 'error'; message: string } | null;

const LAYOUTS = [
  { id: 'grid', label: 'Lưới ảnh' },
  { id: 'collage', label: 'Collage' },
  { id: 'list', label: 'Danh sách' },
];

// Tiêu đề + mô tả (dynamic-desc) của cả trang: phần chữ nằm trên danh sách mục ngoài website.
export default function SectionSettings({
  section,
  locale,
  showLayout = true,
}: {
  section: string;
  locale: Locale;
  showLayout?: boolean;
}) {
  const [state, setState] = useState<{ title: string; description: string; layout: string } | null>(null);
  const [status, setStatus] = useState<Status>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const payload = store.get(section)?.[locale] || {};
    setState({
      title: payload.title || '',
      description: payload.description || '',
      layout: payload.layout || 'grid',
    });
    setStatus(null);
  }, [section, locale]);

  if (!state) return null;

  async function save() {
    if (!state) return;
    const data = store.get(section);
    if (!data) return;
    setSaving(true);
    try {
      data[locale] = {
        ...data[locale],
        title: state.title,
        description: state.description,
        ...(showLayout ? { layout: state.layout } : {}),
      };
      await store.saveSection(section, data);
      setStatus({ kind: 'ok', message: 'Đã lưu tiêu đề và mô tả trang.' });
      window.setTimeout(() => setStatus(null), 3500);
    } catch (error: any) {
      setStatus({ kind: 'error', message: error?.message || 'Lưu thất bại.' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="card settings-card">
      <h3 className="card-title">Trang này trên website ({locale.toUpperCase()})</h3>
      <div className={showLayout ? 'row-2' : ''}>
        <div className="field">
          <label>Tiêu đề trang</label>
          <input
            className="input"
            value={state.title}
            onChange={(event) => setState({ ...state, title: event.target.value })}
            placeholder="nhạc"
          />
        </div>
        {showLayout ? (
          <div className="field">
            <label>Kiểu bố cục</label>
            <select className="select" value={state.layout} onChange={(event) => setState({ ...state, layout: event.target.value })}>
              {LAYOUTS.map((entry) => <option key={entry.id} value={entry.id}>{entry.label}</option>)}
            </select>
          </div>
        ) : null}
      </div>
      <div className="field">
        <label>Mô tả trang (dynamic-desc)</label>
        <textarea
          className="textarea"
          rows={2}
          value={state.description}
          onChange={(event) => setState({ ...state, description: event.target.value })}
          placeholder="Dòng chữ nghiêng ngay dưới tiêu đề trang."
        />
        <div className="hint">Hiện đúng dòng này ở đầu trang ngoài website; để trống thì website bỏ dòng mô tả.</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button type="button" className="btn" onClick={save} disabled={saving}>{saving ? 'Đang lưu…' : 'Lưu tiêu đề & mô tả'}</button>
        {status ? <span className={`status ${status.kind}`}>{status.message}</span> : null}
      </div>
    </section>
  );
}
