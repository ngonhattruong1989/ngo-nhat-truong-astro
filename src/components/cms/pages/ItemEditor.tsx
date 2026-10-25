import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import LocaleTabs from '../LocaleTabs';
import RichText from '../RichText';
import MediaUploader from '../MediaUploader';
import MediaGallery from '../MediaGallery';
import PreviewFrame, { ViewTabs } from '../PreviewFrame';
import SaveBar from '../SaveBar';
import { upload, store, type Dict, type Locale } from '../../../lib/cms/client';
import { createEmptyItem } from '../../../lib/cms/content-model.mjs';
import { legacyHtml } from '../../../lib/cms/legacy.mjs';
import { SECTION_META, sitePathFor } from '../../../lib/cms/sections';

type Status = { kind: 'ok' | 'error'; message: string } | null;

export default function ItemEditor() {
  const { section = '', id = '' } = useParams();
  const navigate = useNavigate();
  const [locale, setLocale] = useState<Locale>('vi');
  const [draft, setDraft] = useState<Dict | null>(null);
  const [status, setStatus] = useState<Status>(null);
  const [savedAt, setSavedAt] = useState('');
  const [present, setPresent] = useState<Record<Locale, boolean>>({ vi: false, en: false, fr: false });
  const [storedTitle, setStoredTitle] = useState('');
  const [view, setView] = useState<'edit' | 'preview'>('edit');
  const meta = SECTION_META[section];

  const contentField = section === 'paintings' ? 'description' : 'html';

  useEffect(() => {
    const item = store.item(section, id, locale);
    setDraft(item ? structuredClone(item) : null);
    setStoredTitle(item?.title || '');
    const locales = store.localesFor(section, id);
    setPresent({ vi: locales.includes('vi'), en: locales.includes('en'), fr: locales.includes('fr') });
    setStatus(null);
  }, [section, id, locale]);


  if (!meta || meta.kind !== 'items') {
    return <section className="card">Trang không tồn tại. <Link to="/">Về tổng quan</Link></section>;
  }

  function set(field: string, value: unknown) {
    setDraft((current) => (current ? { ...current, [field]: value } : current));
  }

  // Slug chỉ đổi khi bấm Lưu.
  function changeTitle(value: string) {
    set('title', value);
  }

  const titleChanged = Boolean(draft) && (draft?.title || '') !== storedTitle;
  const pendingSlug = draft && titleChanged ? store.slugFor(section, draft.title || '', id) : id;

  async function save() {
    if (!draft) return;
    try {
      const nextId = (draft.title || '') !== storedTitle ? store.slugFor(section, draft.title || '', id) : id;
      if (nextId !== id) {
        const result = await store.renameItem(section, id, nextId, locale, draft);
        setSavedAt(new Date().toISOString());
        setStatus({ kind: 'ok', message: `Đã lưu. Slug đổi thành ${nextId}; ${result.moved.length} tệp R2 đã chuyển folder.` });
        navigate(`/${section}/${nextId}`, { replace: true });
        return;
      }
      await store.saveItem(section, locale, draft);
      setStoredTitle(draft.title || '');
      const locales = store.localesFor(section, id);
      setPresent({ vi: locales.includes('vi'), en: locales.includes('en'), fr: locales.includes('fr') });
      setSavedAt(new Date().toISOString());
      setStatus({ kind: 'ok', message: 'Đã lưu vào D1. Website cập nhật ngay.' });
      window.setTimeout(() => setStatus(null), 3500);
    } catch (error: any) {
      setStatus({ kind: 'error', message: error?.message || 'Lưu thất bại.' });
    }
  }

  const content = draft ? (draft[contentField] || legacyHtml(draft.content || '')) : '';
  const hasGallery = Array.isArray(draft?.images) || ['paintings', 'artwork', 'spaces'].includes(section);

  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow"><Link to={`/${section}`}>← {meta.label}</Link> / {id}</div>
          <h1>{draft?.title || id}</h1>
          <p className="subtle">Folder R2: <code>{section}/{id}/</code></p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <LocaleTabs value={locale} onChange={setLocale} present={present} />
          <ViewTabs value={view} onChange={setView} />
        </div>
      </div>

      {!draft ? (
        <section className="card">
          <h3 style={{ marginTop: 0 }}>Bản dịch này chưa có</h3>
          <p className="subtle">Mục <strong>{id}</strong> chưa có nội dung ở {locale.toUpperCase()}. Ảnh dùng chung với ngôn ngữ khác, chỉ phần chữ là bạn tự nhập.</p>
          <button type="button" className="btn" onClick={() => setDraft({ ...createEmptyItem(id, ''), ...store.sharedMedia(section, id) })}>Tạo bản dịch trống</button>
        </section>
      ) : (
        <>
          {view === 'preview' ? (
            <PreviewFrame section={section} id={id} locale={locale} payload={{ title: draft.title || '', items: [draft] }} />
          ) : (
          <div className="editor-grid single">
            <div>
              <section className="card">
                <h3 className="card-title">1. Thông tin</h3>
                <div className="field">
                  <label>Tiêu đề</label>
                  <input className="input input-title" value={draft.title || ''} onChange={(event) => changeTitle(event.target.value)} />
                </div>
                <div className="field">
                  <label>Đường dẫn (tự động từ tiêu đề, đổi khi Lưu)</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="subtle">/{section}/</span>
                    <input className="input" value={id} readOnly />
                  </div>
                  <div className="hint">
                    {pendingSlug !== id
                      ? <>Sau khi bấm Lưu: slug thành <code>{pendingSlug}</code>, folder R2 <code>{section}/{id}/</code> → <code>{section}/{pendingSlug}/</code>.</>
                      : <>Bỏ dấu, thêm gạch. Đổi tiêu đề rồi bấm Lưu mới đổi slug và folder R2.</>}
                  </div>
                </div>
                <div className="row-2">
                  <div className="field"><label>Ngày</label><input className="input" value={draft.date || ''} onChange={(event) => set('date', event.target.value)} placeholder="01/2026" /></div>
                  {section === 'paintings' ? (
                    <div className="field"><label>Chất liệu</label><input className="input" value={draft.medium || ''} onChange={(event) => set('medium', event.target.value)} placeholder="gouache trên giấy dó" /></div>
                  ) : null}
                </div>
                <MediaUploader label="Thumbnail" value={draft.thumbnail || ''} onChange={(url) => set('thumbnail', url)} target={{ scope: 'item', page: section, id: draft.id, kind: 'thumbnail' }} />
                {hasGallery ? (
                  <MediaGallery label="Bộ ảnh" items={draft.images || []} onChange={(items) => set('images', items)} target={{ scope: 'item', page: section, id: draft.id, kind: 'images' }} kind="images" />
                ) : null}
              </section>

              <section className="card">
                <h3 className="card-title">2. Nội dung</h3>
                <p className="subtle" style={{ marginTop: 0 }}>Canvas: chữ, ảnh, video, YouTube. Media tự vào <code>{section}/{draft.id}/</code>.</p>
                <RichText
                  key={`${section}-${id}-${locale}`}
                  value={content}
                  onChange={(html) => set(contentField, html)}
                  mediaContext={{ scope: 'item', page: section, id: draft.id }}
                  upload={upload}
                />
              </section>
            </div>
          </div>
          )}

          <SaveBar
            savedAt={savedAt}
            status={status}
            onSave={save}
            liveHref={sitePathFor(section, id)}
            extra={<button type="button" className="btn ghost" onClick={() => navigate(`/${section}`)}>← Danh sách</button>}
          />
        </>
      )}

    </>
  );
}
