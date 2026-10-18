import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { MediaTarget, UploadFn } from '../../lib/cms/client';

type Tab = 'image' | 'video' | 'youtube';

type Props = {
  open: boolean;
  initialTab?: Tab;
  target: MediaTarget;
  upload: UploadFn;
  onClose: () => void;
  onInsertImage: (url: string) => void;
  onInsertVideo: (url: string) => void;
  onInsertYoutube: (embedUrl: string) => void;
};

export function youtubeToEmbed(value: string) {
  const raw = value.trim();
  const direct = /^https:\/\/(?:www\.)?(?:youtube\.com|youtube-nocookie\.com)\/embed\/([A-Za-z0-9_-]{6,20})/.exec(raw);
  if (direct) return `https://www.youtube.com/embed/${direct[1]}`;
  const watch = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]{6,20})/.exec(raw);
  return watch ? `https://www.youtube.com/embed/${watch[1]}` : '';
}

export default function MediaDialog({ open, initialTab = 'image', target, upload, onClose, onInsertImage, onInsertVideo, onInsertYoutube }: Props) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setTab(initialTab);
      setUrl('');
      setError('');
    }
  }, [open, initialTab]);

  if (!open) return null;

  async function pick(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError('');
    try {
      const kind = tab === 'video' ? 'video' : target.kind;
      const result = await upload(file, { ...target, kind });
      setUrl(result.url);
      if (kind === 'video') onInsertVideo(result.url);
      else onInsertImage(result.url);
      onClose();
    } catch (cause: any) {
      setError(cause?.message || 'Tải lên thất bại.');
    } finally {
      setBusy(false);
    }
  }

  return createPortal(
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal">
        <div className="modal-head">
          <strong>Chèn media</strong>
          <button type="button" className="tb" onClick={onClose} aria-label="Đóng">✕</button>
        </div>
        <div className="modal-tabs">
          <button type="button" className={`locale-tab ${tab === 'image' ? 'active' : ''}`} onClick={() => setTab('image')}>Ảnh</button>
          <button type="button" className={`locale-tab ${tab === 'video' ? 'active' : ''}`} onClick={() => setTab('video')}>Video</button>
          <button type="button" className={`locale-tab ${tab === 'youtube' ? 'active' : ''}`} onClick={() => setTab('youtube')}>YouTube</button>
        </div>

        {tab === 'youtube' ? (
          <div className="field" key="youtube">
            <label>Link YouTube hoặc ID video</label>
            <input className="input" value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://www.youtube.com/watch?v=…" />
            <div className="hint">Nhúng dạng iframe 16:9, không tự phát.</div>
          </div>
        ) : (
          <div className="field" key={tab}>
            <label>{tab === 'video' ? 'Tải video từ máy (tối đa 60 MB)' : 'Tải ảnh từ máy (tối đa 15 MB)'}</label>
            <input
              type="file"
              accept={tab === 'video' ? 'video/mp4,video/webm' : 'image/jpeg,image/png,image/webp,image/gif'}
              disabled={busy}
              onChange={(event) => pick(event.target.files?.[0])}
            />
            <label>…hoặc dán link R2 / URL</label>
            <input className="input" value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://public.ngonhattruong.com/…" />
          </div>
        )}

        {error ? <div className="status error">{error}</div> : null}

        <div className="modal-foot">
          <button type="button" className="btn ghost" onClick={onClose}>Hủy</button>
          <button
            type="button"
            className="btn"
            disabled={!url || busy}
            onClick={() => {
              if (tab === 'youtube') {
                const embed = youtubeToEmbed(url);
                if (!embed) { setError('Link YouTube không hợp lệ.'); return; }
                onInsertYoutube(embed);
              } else if (tab === 'video') onInsertVideo(url);
              else onInsertImage(url);
              onClose();
            }}
          >
            Chèn
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
