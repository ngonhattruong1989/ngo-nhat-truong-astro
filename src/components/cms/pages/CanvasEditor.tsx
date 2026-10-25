import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import LocaleTabs from '../LocaleTabs';
import RichText from '../RichText';
import PreviewFrame, { ViewTabs } from '../PreviewFrame';
import SaveBar from '../SaveBar';
import { upload, store, type Locale, type SectionPayload } from '../../../lib/cms/client';
import { itemsToCanvasHtml } from '../../../lib/cms/legacy.mjs';
import { SECTION_META } from '../../../lib/cms/sections';

type Status = { kind: 'ok' | 'error'; message: string } | null;

export default function CanvasEditor({ section }: { section: 'about' | 'contact' }) {
  const [locale, setLocale] = useState<Locale>('vi');
  const [data, setData] = useState<SectionPayload | null>(null);
  const [status, setStatus] = useState<Status>(null);
  const [savedAt, setSavedAt] = useState('');
  const [view, setView] = useState<'edit' | 'preview'>('edit');
  const meta = SECTION_META[section];

  useEffect(() => {
    setData(store.get(section));
    setStatus(null);
  }, [section]);

  if (!data) return null;
  const payload = data[locale] || {};
  const html = payload.html || itemsToCanvasHtml(payload.items);
  const present = Object.fromEntries(
    (['vi', 'en', 'fr'] as Locale[]).map((code) => [code, Boolean(data[code]?.html || data[code]?.items?.length)]),
  ) as Record<Locale, boolean>;

  function update(patch: Record<string, unknown>) {
    setData((current) => (current ? { ...current, [locale]: { ...current[locale], ...patch } } : current));
  }

  async function save() {
    if (!data) return;
    try {
      await store.saveSection(section, data);
      setSavedAt(new Date().toISOString());
      setStatus({ kind: 'ok', message: 'Đã lưu. Website cập nhật ngay.' });
      window.setTimeout(() => setStatus(null), 3500);
    } catch (error: any) {
      setStatus({ kind: 'error', message: error?.message || 'Lưu thất bại.' });
    }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow"><Link to="/">← Tổng quan</Link> / {meta.label}</div>
          <h1>{meta.label}</h1>
          <p className="subtle">Một canvas tự do cho mỗi ngôn ngữ — bố cục do bạn quyết định, không có field cứng.</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <LocaleTabs value={locale} onChange={setLocale} present={present} />
          <ViewTabs value={view} onChange={setView} />
        </div>
      </div>

      {view === 'preview' ? (
        <PreviewFrame section={section} locale={locale} payload={{ title: payload.title || '', html }} />
      ) : (
        <div className="editor-grid single">
          <div>
            <section className="card">
              <div className="field">
                <label>Tiêu đề trang ({locale.toUpperCase()})</label>
                <input className="input" value={payload.title || ''} onChange={(event) => update({ title: event.target.value })} />
              </div>
              <p className="subtle" style={{ marginTop: 0 }}>Canvas: chữ, ảnh, video, YouTube. Media vào <code>{section}/{locale}/</code>.</p>
              <RichText
                key={`${section}-${locale}`}
                value={html}
                onChange={(next) => update({ html: next })}
                placeholder="Viết nội dung cho trang này…"
                mediaContext={{ scope: 'page', page: section, locale }}
                upload={upload}
              />
            </section>
          </div>
        </div>
      )}

      <SaveBar savedAt={savedAt} status={status} onSave={save} liveHref={`/${section}`} />
    </>
  );
}
