import { useRef, useState } from 'react';
import { previewSrc, store, mediaKeyOf, type MediaTarget } from '../../lib/cms/client';
import ImageEditor from './ImageEditor';

type Props = {
  items: string[];
  onChange: (items: string[]) => void;
  target: MediaTarget;
  kind: string;
  label: string;
};

export default function MediaGallery({ items, onChange, target, kind, label }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState('');
  const [editing, setEditing] = useState<{ index: number; src: string } | null>(null);
  const [error, setError] = useState('');

  async function add(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('Chỉ nhận ảnh JPEG/PNG/WebP/GIF.'); return; }
    if (file.size > 15 * 1024 * 1024) { setError('Ảnh vượt 15 MB.'); return; }
    setError('');
    const result = await store.upload(file, { ...target, kind });
    onChange([...items, result.url]);
  }

  function addUrl() {
    const value = url.trim();
    if (!value) return;
    if (!/^(https?:\/\/|\/)/i.test(value)) {
      setError('Link phải bắt đầu bằng https:// hoặc /duong-dan.');
      return;
    }
    setError('');
    onChange([...items, value]);
    setUrl('');
  }

  function move(index: number, direction: -1 | 1) {
    const next = [...items];
    const to = index + direction;
    if (to < 0 || to >= next.length) return;
    [next[index], next[to]] = [next[to], next[index]];
    onChange(next);
  }

  function remove(index: number) {
    const key = mediaKeyOf(items[index]);
    if (key) void store.deleteMedia(key);
    onChange(items.filter((_, i) => i !== index));
  }

  return (
    <div className="field">
      <label>{label} ({items.length})</label>
      <div className="media-list">
        {items.map((url, index) => (
          <div className="media-item" key={`${url}-${index}`}>
            <img src={previewSrc(url)} alt="" />
            <div className="tools">
              <button type="button" onClick={() => move(index, -1)} title="Lên">↑</button>
              <button type="button" onClick={() => move(index, 1)} title="Xuống">↓</button>
              <button type="button" onClick={() => setEditing({ index, src: url })} title="Chỉnh sửa ảnh">✂</button>
              <button type="button" onClick={() => remove(index)} title="Xóa">✕</button>
            </div>
          </div>
        ))}
        <button type="button" className="media-item" onClick={() => inputRef.current?.click()} style={{ cursor: 'pointer', color: '#7d8a80' }}>+</button>
      </div>
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" hidden onChange={(event) => void add(event.target.files)} />
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          className="input"
          value={url}
          placeholder="Dán link R2 / URL ảnh rồi bấm Thêm"
          onChange={(event) => setUrl(event.target.value)}
          onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addUrl(); } }}
        />
        <button type="button" className="btn secondary" onClick={addUrl} disabled={!url.trim()}>Thêm</button>
        <button type="button" className="btn ghost" onClick={() => inputRef.current?.click()}>Tải lên</button>
      </div>
      {error ? <div className="status error">{error}</div> : null}
      {editing ? (
        <ImageEditor
          open
          src={editing.src}
          target={target}
          onClose={() => setEditing(null)}
          onSaved={(next) => {
            const copy = [...items];
            copy[editing.index] = next;
            onChange(copy);
            setEditing(null);
          }}
        />
      ) : null}
      <div className="hint">Thứ tự ảnh = thứ tự hiển thị ngoài website. Ảnh upload lưu vào <code>{target.scope === 'film' ? `films/${target.id}` : `${target.page}/${target.id}`}/{kind}/</code>.</div>
    </div>
  );
}
