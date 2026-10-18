import type { ReactNode } from 'react';

type Props = {
  savedAt?: string;
  saving?: boolean;
  status?: { kind: 'ok' | 'error'; message: string } | null;
  onSave: () => void;
  extra?: ReactNode;
  liveHref?: string;
};

export default function SaveBar({ savedAt, saving = false, status, onSave, extra, liveHref }: Props) {
  return (
    <div className="savebar">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        {status ? <span className={`status ${status.kind}`}>{status.message}</span> : null}
        {!status && savedAt ? <span className="subtle">Đã lưu lúc {new Date(savedAt).toLocaleTimeString('vi-VN')}</span> : null}
        {!status && !savedAt ? <span className="subtle">Chưa có thay đổi</span> : null}
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        {liveHref ? <a className="btn ghost" href={liveHref} target="_blank" rel="noreferrer">Xem ngoài web ↗</a> : null}
        {extra}
        <button type="button" className="btn" onClick={onSave} disabled={saving}>{saving ? 'Đang lưu…' : 'Lưu thay đổi'}</button>
      </div>
    </div>
  );
}
