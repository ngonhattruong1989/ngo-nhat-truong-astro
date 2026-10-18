import { useEffect, useRef, useState } from 'react';
import { store, mediaKeyOf, type MediaTarget } from '../../lib/cms/client';
import { RATIOS, centeredRect, clampRect, moveRect, resizeRect, outputSize, ratioValue } from '../../lib/cms/crop.mjs';

type Props = {
  open: boolean;
  src: string;
  target: MediaTarget;
  filename?: string;
  onClose: () => void;
  onSaved: (url: string) => void;
};

type Rect = { x: number; y: number; w: number; h: number };

export default function ImageEditor({ open, src, target, filename, onClose, onSaved }: Props) {
  const [natural, setNatural] = useState({ w: 0, h: 0 });
  const [display, setDisplay] = useState({ w: 0, h: 0 });
  const [rect, setRect] = useState<Rect>({ x: 0, y: 0, w: 0, h: 0 });
  const [ratio, setRatio] = useState('free');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const urlRef = useRef('');
  const imgRef = useRef<HTMLImageElement | null>(null);
  const boxRef = useRef<HTMLDivElement | null>(null);

  // Tải ảnh qua proxy cùng origin để canvas không bị "tainted" (R2 không có CORS).
  useEffect(() => {
    if (!open || !src) return;
    let cancelled = false;
    setLoading(true);
    setError('');
    setNatural({ w: 0, h: 0 });
    fetch(`/api/cms/image?url=${encodeURIComponent(src)}`, { credentials: 'same-origin' })
      .then(async (response) => {
        if (!response.ok) throw new Error('Không tải được ảnh để chỉnh sửa.');
        return response.blob();
      })
      .then((blob) => {
        if (cancelled) return;
        if (urlRef.current) URL.revokeObjectURL(urlRef.current);
        urlRef.current = URL.createObjectURL(blob);
        const image = new Image();
        image.onload = () => {
          if (cancelled) return;
          setNatural({ w: image.naturalWidth, h: image.naturalHeight });
          setRect({ x: 0, y: 0, w: image.naturalWidth, h: image.naturalHeight });
          setRatio('free');
          setLoading(false);
        };
        image.onerror = () => { setError('Ảnh không hợp lệ.'); setLoading(false); };
        image.src = urlRef.current;
      })
      .catch((cause) => {
        if (cancelled) return;
        setError(cause?.message || 'Không tải được ảnh.');
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [open, src]);

  // Co giãn theo khung hiển thị.
  useEffect(() => {
    if (!open || !natural.w) return;
    function measure() {
      const maxWidth = 620;
      const maxHeight = 420;
      const scale = Math.min(maxWidth / natural.w, maxHeight / natural.h, 1);
      setDisplay({ w: Math.round(natural.w * scale), h: Math.round(natural.h * scale) });
    }
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [open, natural]);

  if (!open) return null;

  const scale = natural.w ? display.w / natural.w : 1;
  const ratioNumber = ratioValue(ratio, natural.w, natural.h);

  function pickRatio(id: string) {
    setRatio(id);
    const next = ratioValue(id, natural.w, natural.h);
    if (!next) return;
    setRect(centeredRect(natural.w, natural.h, next));
  }

  function startDrag(event: React.PointerEvent, mode: 'move' | 'nw' | 'ne' | 'sw' | 'se') {
    event.preventDefault();
    event.stopPropagation();
    const startX = event.clientX;
    const startY = event.clientY;
    const start = rect;
    const box = boxRef.current;
    const width = box?.parentElement?.clientWidth || display.w;

    function onMove(moveEvent: PointerEvent) {
      const dx = (moveEvent.clientX - startX) / width * natural.w;
      const dy = (moveEvent.clientY - startY) / width * natural.w;
      setRect(mode === 'move'
        ? moveRect(start, dx, dy, natural.w, natural.h)
        : resizeRect(start, mode, dx, dy, natural.w, natural.h, ratioNumber));
    }
    function onUp() {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    }
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }

  async function apply() {
    const image = imgRef.current;
    if (!image || !natural.w) return;
    setBusy(true);
    setError('');
    try {
      const size = outputSize(rect, 2400);
      const canvas = document.createElement('canvas');
      canvas.width = size.width;
      canvas.height = size.height;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Trình duyệt không hỗ trợ canvas.');
      context.drawImage(image, rect.x, rect.y, rect.w, rect.h, 0, 0, size.width, size.height);

      const keepPng = /\.png$/i.test(src.split('?')[0]);
      const type = keepPng ? 'image/png' : 'image/jpeg';
      const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, type, keepPng ? undefined : 0.92));
      if (!blob) throw new Error('Không xuất được ảnh.');

      const baseName = (filename || src.split('/').pop() || 'anh').replace(/\.[a-z0-9]+$/i, '');
      const extension = keepPng ? 'png' : 'jpg';
      const file = new File([blob], `${baseName}-crop.${extension}`, { type });
      const result = await store.upload(file, target);
      onSaved(result.url);
      onClose();
    } catch (cause: any) {
      setError(cause?.message || 'Lưu ảnh đã cắt thất bại.');
    } finally {
      setBusy(false);
    }
  }

  const originalKey = mediaKeyOf(src);

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal image-editor">
        <div className="modal-head">
          <div>
            <h2>Chỉnh sửa ảnh</h2>
            <div className="subtle">
              {natural.w ? `${natural.w} × ${natural.h}px` : 'Đang tải…'}
              {originalKey ? ` · ${originalKey}` : ''}
            </div>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Đóng">×</button>
        </div>

        <div className="modal-body">
          <div className="crop-stage" style={{ width: display.w || 320, height: display.h || 200 }}>
            {loading ? <div className="crop-loading">Đang tải ảnh…</div> : null}
            <img
              ref={(node) => { imgRef.current = node; }}
              src={urlRef.current || undefined}
              alt=""
              style={{ width: display.w || '100%', height: display.h || 'auto' }}
              draggable={false}
            />
            {natural.w ? (
              <div
                ref={boxRef}
                className="crop-box"
                style={{ left: rect.x * scale, top: rect.y * scale, width: rect.w * scale, height: rect.h * scale }}
                onPointerDown={(event) => startDrag(event, 'move')}
              >
                <span className="crop-handle nw" onPointerDown={(event) => startDrag(event, 'nw')} />
                <span className="crop-handle ne" onPointerDown={(event) => startDrag(event, 'ne')} />
                <span className="crop-handle sw" onPointerDown={(event) => startDrag(event, 'sw')} />
                <span className="crop-handle se" onPointerDown={(event) => startDrag(event, 'se')} />
              </div>
            ) : null}
          </div>

          <div className="crop-controls">
            <div className="field">
              <label>Tỉ lệ khung hình</label>
              <div className="chips">
                {RATIOS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    className={`chip ${ratio === preset.id ? 'chip-active' : ''}`}
                    onClick={() => pickRatio(preset.id)}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="crop-readout subtle">
              Vùng cắt: {Math.round(rect.w)} × {Math.round(rect.h)}px · xuất {outputSize(rect, 2400).width} × {outputSize(rect, 2400).height}px
              {ratio === 'free' ? ' · kéo góc để đổi kích thước' : ''}
            </div>
            <div className="crop-readout subtle">
              Ảnh đã cắt được lưu thành object mới trong R2 ({target.scope === 'film' ? `films/${target.id}` : `${target.page}/${target.id || target.locale}`}); ảnh gốc giữ nguyên.
            </div>

            {error ? <div className="status error">{error}</div> : null}
          </div>
        </div>

        <div className="modal-foot">
          <button type="button" className="btn ghost" onClick={() => { setRect({ x: 0, y: 0, w: natural.w, h: natural.h }); setRatio('free'); }}>Đặt lại</button>
          <button type="button" className="btn ghost" onClick={onClose}>Huỷ</button>
          <button type="button" className="btn" onClick={apply} disabled={busy || !natural.w}>{busy ? 'Đang lưu…' : 'Lưu vào R2'}</button>
        </div>
      </div>
    </div>
  );
}
