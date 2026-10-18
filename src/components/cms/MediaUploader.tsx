import { useRef, useState } from 'react';
import { previewSrc, store, mediaKeyOf, withVersion, type MediaTarget } from '../../lib/cms/client';
import ImageEditor from './ImageEditor';

type Props = {
  value: string;
  onChange: (url: string) => void;
  target: MediaTarget;
  label?: string;
  media?: 'image' | 'video';
  onRemoveObject?: (key: string) => void;
};

const LIMITS = { image: 15 * 1024 * 1024, video: 60 * 1024 * 1024 };

export default function MediaUploader({ value, onChange, target, label = 'Ảnh', media = 'image', onRemoveObject }: Props) {
  const [dragging, setDragging] = useState(false);
  const [pending, setPending] = useState<{ key: string; url: string } | null>(null);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const [editing, setEditing] = useState(false);
  const [version, setVersion] = useState(0);

  async function handleFiles(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    if (media === 'video' && !file.type.startsWith('video/')) {
      setError('Ô này chỉ nhận video MP4/WebM.');
      return;
    }
    if (media === 'image' && !file.type.startsWith('image/')) {
      setError('Ô này chỉ nhận ảnh JPEG/PNG/WebP/GIF.');
      return;
    }
    if (file.size > LIMITS[media]) {
      setError(`Tệp vượt ${media === 'video' ? '60' : '15'} MB.`);
      return;
    }
    setError('');
    const result = await store.upload(file, { ...target, kind: media === 'video' ? 'video' : target.kind });
    setPending({ key: result.key, url: result.localUrl });
    onChange(result.url);
  }

  function clear() {
    const key = mediaKeyOf(value);
    if (key) {
      void store.deleteMedia(key);
      onRemoveObject?.(key);
    }
    setPending(null);
    onChange('');
  }

  const folder = pending?.key ? pending.key.split('/').slice(0, -1).join('/') : mediaKeyOf(value).split('/').slice(0, -1).join('/');

  return (
    <div className="field">
      <label>{label}</label>
      <div style={{ display: 'flex', gap: 8 }}>
        <input className="input" value={value} placeholder="Dán link R2 hoặc https://…" onChange={(event) => onChange(event.target.value)} />
        <button type="button" className="btn secondary" onClick={() => inputRef.current?.click()}>Tải lên</button>
        {value ? <button type="button" className="btn danger" onClick={clear} title="Xóa tệp và object R2">✕</button> : null}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={media === 'video' ? 'video/mp4,video/webm' : 'image/jpeg,image/png,image/webp,image/gif'}
        hidden
        onChange={(event) => void handleFiles(event.target.files)}
      />
      <div
        className={`dropzone ${dragging ? 'over' : ''}`}
        onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => { event.preventDefault(); setDragging(false); handleFiles(event.dataTransfer.files); }}
        onClick={() => inputRef.current?.click()}
      >
        Kéo thả {media === 'video' ? 'video' : 'ảnh'} vào đây — lưu thẳng vào R2
      </div>
      {value && media === 'image' ? (
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <button type="button" className="btn secondary" onClick={() => setEditing(true)}>Chỉnh sửa ảnh</button>
          <span className="subtle" style={{ alignSelf: 'center' }}>cắt theo tỉ lệ, lưu thành object mới</span>
        </div>
      ) : null}
      {value ? (
        <div className="media-preview">
          {media === 'video' ? (
            <video src={previewSrc(pending?.url || value)} controls />
          ) : (
            <img src={previewSrc(withVersion(pending?.url || value, version))} alt="" />
          )}
        </div>
      ) : null}
      {error ? <div className="status error">{error}</div> : null}
      {pending ? <div style={{ marginTop: 6 }}><span className="key-hint">sẽ lưu: {pending.key}</span></div> : null}
      {value && folder ? <div style={{ marginTop: 6 }}><span className="key-hint">R2 folder: {folder}</span></div> : null}
      <ImageEditor
        open={editing}
        src={value}
        target={target}
        onClose={() => setEditing(false)}
        onSaved={(url) => { setPending(null); onChange(url); setVersion(Date.now()); }}
      />
    </div>
  );
}
