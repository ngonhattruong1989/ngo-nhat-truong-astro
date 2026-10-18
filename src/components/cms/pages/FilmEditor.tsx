import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import LocaleTabs from '../LocaleTabs';
import RichText from '../RichText';
import MediaUploader from '../MediaUploader';
import MediaGallery from '../MediaGallery';
import PreviewPane from '../PreviewPane';
import DeleteDialog from '../DeleteDialog';
import SaveBar from '../SaveBar';
import { upload, store, openPreview, type Dict, type Locale } from '../../../lib/cms/client';
import { createEmptyFilm } from '../../../lib/cms/content-model.mjs';
import { youtubeId } from '../../../lib/cms/youtube.mjs';

type Status = { kind: 'ok' | 'error'; message: string } | null;

export default function FilmEditor() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [locale, setLocale] = useState<Locale>('vi');
  const [draft, setDraft] = useState<Dict | null>(null);
  const [status, setStatus] = useState<Status>(null);
  const [savedAt, setSavedAt] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [present, setPresent] = useState<Record<Locale, boolean>>({ vi: false, en: false, fr: false });
  const [storedTitle, setStoredTitle] = useState('');

  useEffect(() => {
    const item = store.item('films', id, locale);
    setDraft(item ? structuredClone(item) : null);
    setStoredTitle(item?.title || '');
    const locales = store.localesFor('films', id);
    setPresent({ vi: locales.includes('vi'), en: locales.includes('en'), fr: locales.includes('fr') });
    setStatus(null);
  }, [id, locale]);

  const mediaKeys = useMemo(() => (confirmDelete ? store.mediaKeysFor('films', id) : []), [confirmDelete, id]);

  function set(field: string, value: unknown) {
    setDraft((current) => (current ? { ...current, [field]: value } : current));
  }

  // Slug chỉ đổi khi bấm Lưu (xem save); gõ tiêu đề không làm nhảy folder R2.
  function changeTitle(value: string) {
    set('title', value);
  }

  const titleChanged = Boolean(draft) && (draft?.title || '') !== storedTitle;
  const pendingSlug = draft && titleChanged ? store.slugFor('films', draft.title || '', id) : id;

  function createTranslation() {
    const base = store.item('films', id, 'vi') || store.item('films', id, 'en');
    setDraft(createEmptyFilm(id, base?.title || ''));
  }

  async function save() {
    if (!draft) return;
    try {
      const nextId = (draft.title || '') !== storedTitle ? store.slugFor('films', draft.title || '', id) : id;
      if (nextId !== id) {
        const result = await store.renameItem('films', id, nextId, locale, draft);
        setSavedAt(new Date().toISOString());
        setStatus({ kind: 'ok', message: `Đã lưu. Slug đổi thành ${nextId}; ${result.moved.length} tệp R2 đã chuyển folder.` });
        navigate(`/films/${nextId}`, { replace: true });
        return;
      }
      await store.saveItem('films', locale, draft);
      setStoredTitle(draft.title || '');
      const locales = store.localesFor('films', id);
      setPresent({ vi: locales.includes('vi'), en: locales.includes('en'), fr: locales.includes('fr') });
      setSavedAt(new Date().toISOString());
      setStatus({ kind: 'ok', message: 'Đã lưu vào D1 (mock). Website cập nhật ngay.' });
      window.setTimeout(() => setStatus(null), 3500);
    } catch (error: any) {
      setStatus({ kind: 'error', message: error?.message || 'Lưu thất bại.' });
    }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow"><Link to="/films">← Phim</Link> / {id}</div>
          <h1>{draft?.title || id}</h1>
          <p className="subtle">Folder R2: <code>films/{id}/</code> · Thay đổi ở đây chỉ ghi vào D1 + R2, không sửa codebase.</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <LocaleTabs value={locale} onChange={setLocale} present={present} />
          <button type="button" className="btn danger" onClick={() => setConfirmDelete(true)}>Xóa phim</button>
        </div>
      </div>

      {!draft ? (
        <section className="card">
          <h3 style={{ marginTop: 0 }}>Bản dịch này chưa có</h3>
          <p className="subtle">Phim <strong>{id}</strong> chưa có nội dung ở {locale.toUpperCase()}. Tạo bản trống rồi nhập lại — không tự copy từ ngôn ngữ khác.</p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="btn" onClick={createTranslation}>Tạo bản dịch trống</button>
            <button type="button" className="btn ghost" onClick={() => navigate('/films')}>Quay lại danh sách</button>
          </div>
        </section>
      ) : (
        <>
          <div className="editor-grid">
            <div>
              <section className="card">
                <h3 className="card-title">1. Thông tin phim</h3>
                <div className="field">
                  <label>Tiêu đề phim</label>
                  <input className="input input-title" value={draft.title || ''} onChange={(event) => changeTitle(event.target.value)} placeholder="Phục Sinh" />
                </div>
                <div className="field">
                  <label>Đường dẫn (tự động từ tiêu đề, đổi khi Lưu)</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="subtle">/films/</span>
                    <input className="input" value={id} readOnly />
                  </div>
                  <div className="hint">
                    {pendingSlug !== id
                      ? <>Sau khi bấm Lưu: slug thành <code>{pendingSlug}</code>, folder R2 <code>films/{id}/</code> → <code>films/{pendingSlug}/</code>.</>
                      : <>Bỏ dấu, thêm gạch. Đổi tiêu đề rồi bấm Lưu mới đổi slug và folder R2.</>}
                  </div>
                </div>
                <div className="row-3">
                  <div className="field"><label>Thể loại</label><input className="input" value={draft.genre || ''} onChange={(event) => set('genre', event.target.value)} /></div>
                  <div className="field"><label>Năm</label><input className="input" value={draft.year || ''} onChange={(event) => set('year', event.target.value)} /></div>
                  <div className="field"><label>Thời lượng</label><input className="input" value={draft.duration || ''} onChange={(event) => set('duration', event.target.value)} /></div>
                </div>
                <div className="field">
                  <label>YouTube (ID hoặc link)</label>
                  <input
                    className="input"
                    value={draft.youtubeId || ''}
                    onChange={(event) => set('youtubeId', youtubeId(event.target.value))}
                    onBlur={(event) => set('youtubeId', youtubeId(event.target.value))}
                    placeholder="w9I_AQBpKps hoặc https://youtu.be/…"
                  />
                  <div className="hint">Dán link watch / youtu.be sẽ tự tách ID. Bỏ trống nếu đã có Video URL ở dưới.</div>
                </div>
                <MediaUploader
                  label="Video URL (R2) — nếu có, web phát video này thay cho YouTube"
                  media="video"
                  value={draft.videoUrl || ''}
                  onChange={(url) => set('videoUrl', url)}
                  target={{ scope: 'film', page: 'films', id: draft.id, kind: 'video' }}
                />
              </section>

              <section className="card">
                <h3 className="card-title">2. Hình ảnh</h3>
                <MediaUploader label="Poster (trang chi tiết)" value={draft.poster || ''} onChange={(url) => set('poster', url)} target={{ scope: 'film', page: 'films', id: draft.id, kind: 'poster' }} />
                <MediaUploader label="Thumbnail danh sách" value={draft.thumbnail || ''} onChange={(url) => set('thumbnail', url)} target={{ scope: 'film', page: 'films', id: draft.id, kind: 'thumbnail' }} />
                <MediaGallery label="Still" items={draft.stills || []} onChange={(items) => set('stills', items)} target={{ scope: 'film', page: 'films', id: draft.id, kind: 'stills' }} kind="stills" />
                <MediaGallery label="Hậu trường (BTS)" items={draft.bts || []} onChange={(items) => set('bts', items)} target={{ scope: 'film', page: 'films', id: draft.id, kind: 'bts' }} kind="bts" />
              </section>

              <section className="card">
                <h3 className="card-title">3. Crew / Credit</h3>
                <p className="subtle" style={{ marginTop: 0 }}>Canvas đầy đủ: chữ, ảnh, video, YouTube. Undo/redo bằng nút ↶ ↷ hoặc Cmd/Ctrl+Z.</p>
                <RichText
                  value={draft.crew || ''}
                  onChange={(html) => set('crew', html)}
                  placeholder="Đạo diễn / Kịch bản: …"
                  mediaContext={{ scope: 'film', page: 'films', id: draft.id }}
                  upload={upload}
                />
              </section>
            </div>

            <PreviewPane
              title={draft.title || ''}
              meta={[draft.genre, draft.year, draft.duration].filter(Boolean).join(' · ')}
              html={draft.crew || ''}
              cover={draft.poster || draft.thumbnail}
              isFilm
              videoUrl={draft.videoUrl}
              youtubeId={draft.youtubeId}
            />
          </div>

          <SaveBar
            savedAt={savedAt}
            status={status}
            onSave={save}
            liveHref="/#films"
            extra={<><button type="button" className="btn ghost" onClick={() => draft && openPreview('films', id, locale, draft)}>Preview thật ↗</button><button type="button" className="btn ghost" onClick={() => navigate('/films')}>← Danh sách</button></>}
          />
        </>
      )}

      <DeleteDialog
        open={confirmDelete}
        title={draft?.title || id}
        slug={id}
        locales={3}
        mediaKeys={mediaKeys}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => {
          void store.deleteEverywhere('films', id).then(() => navigate('/films'));
        }}
      />
    </>
  );
}
