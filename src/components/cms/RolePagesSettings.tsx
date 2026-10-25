import { useEffect, useState } from 'react';
import { store, type SectionPayload, type Locale } from '../../lib/cms/client';
import { FILM_ROLES, roleLabel } from '../../lib/cms/roles.mjs';

type Status = { kind: 'ok' | 'error'; message: string } | null;
type Copy = { title: string; description: string };

// Hai trang vai trò ngoài website có tiêu đề + mô tả riêng (mỗi ngôn ngữ một bộ).
export default function RolePagesSettings({ locale }: { locale: Locale }) {
  const [state, setState] = useState<Record<string, Copy> | null>(null);
  const [status, setStatus] = useState<Status>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const payload = store.get('films')?.[locale] || {};
    const pages = payload.rolePages || {};
    const next: Record<string, Copy> = {};
    for (const role of FILM_ROLES) {
      next[role] = {
        title: pages[role]?.title || `${roleLabel(role, 'vi')} — ${payload.title || 'phim'}`,
        description: pages[role]?.description || payload.description || '',
      };
    }
    setState(next);
    setStatus(null);
  }, [locale]);

  if (!state) return null;

  function update(role: string, patch: Partial<Copy>) {
    setState((current) => (current ? { ...current, [role]: { ...current[role], ...patch } } : current));
  }

  async function save() {
    if (!state) return;
    const data = store.get('films') as SectionPayload | undefined;
    if (!data) return;
    setSaving(true);
    try {
      data[locale] = { ...data[locale], rolePages: state };
      await store.saveSection('films', data);
      setStatus({ kind: 'ok', message: 'Đã lưu tiêu đề & mô tả 2 trang vai trò.' });
      window.setTimeout(() => setStatus(null), 3500);
    } catch (error: any) {
      setStatus({ kind: 'error', message: error?.message || 'Lưu thất bại.' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="card settings-card">
      <h3 className="card-title">Hai trang vai trò trên website ({locale.toUpperCase()})</h3>
      <p className="subtle" style={{ marginTop: 0 }}>
        Tiêu đề và mô tả hiện ở đầu <code>/films/actor</code> và <code>/films/production-designer</code>. Danh sách dự án thì lấy theo checkbox vai trò của từng phim.
      </p>
      {FILM_ROLES.map((role) => (
        <div key={role} className="role-page-block">
          <div className="field">
            <label>{roleLabel(role, 'vi')} — tiêu đề trang</label>
            <input
              className="input"
              value={state[role].title}
              onChange={(event) => update(role, { title: event.target.value })}
            />
          </div>
          <div className="field">
            <label>{roleLabel(role, 'vi')} — mô tả trang</label>
            <textarea
              className="textarea"
              rows={2}
              value={state[role].description}
              onChange={(event) => update(role, { description: event.target.value })}
            />
          </div>
        </div>
      ))}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button type="button" className="btn" onClick={save} disabled={saving}>{saving ? 'Đang lưu…' : 'Lưu 2 trang vai trò'}</button>
        {status ? <span className={`status ${status.kind}`}>{status.message}</span> : null}
      </div>
    </section>
  );
}
