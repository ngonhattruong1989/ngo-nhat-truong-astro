import { useState } from 'react';
import { createPortal } from 'react-dom';

type Props = {
  open: boolean;
  title: string;
  slug: string;
  locales: number;
  mediaKeys: string[];
  onCancel: () => void;
  onConfirm: () => void;
};

export default function DeleteDialog({ open, title, slug, locales, mediaKeys, onCancel, onConfirm }: Props) {
  const [typed, setTyped] = useState('');
  if (!open) return null;

  return createPortal(
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal">
        <div className="modal-head">
          <strong>Xóa vĩnh viễn</strong>
          <button type="button" className="tb" onClick={onCancel} aria-label="Đóng">✕</button>
        </div>
        <p style={{ margin: 0, lineHeight: 1.6 }}>
          Sẽ xóa <strong>{title}</strong> khỏi <strong>{locales} ngôn ngữ</strong> và{' '}
          <strong>{mediaKeys.length} tệp trên R2</strong>. Không thể hoàn tác.
        </p>
        {mediaKeys.length ? (
          <ul className="danger-list">
            {mediaKeys.slice(0, 8).map((key) => <li key={key}><code>{key}</code></li>)}
            {mediaKeys.length > 8 ? <li>… và {mediaKeys.length - 8} tệp khác</li> : null}
          </ul>
        ) : (
          <p className="subtle" style={{ margin: 0 }}>Không có tệp nào trong folder R2 của mục này.</p>
        )}
        <div className="field">
          <label>Gõ lại slug <code>{slug}</code> để xác nhận</label>
          <input className="input" value={typed} onChange={(event) => setTyped(event.target.value)} placeholder="Gõ slug để xác nhận" />
        </div>
        <div className="modal-foot">
          <button type="button" className="btn ghost" onClick={onCancel}>Hủy</button>
          <button type="button" className="btn danger" disabled={typed !== slug} onClick={onConfirm}>Xóa vĩnh viễn</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
