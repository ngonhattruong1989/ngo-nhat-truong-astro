import { useCallback, useEffect, useRef, useState } from 'react';

type Props = {
  section: string;
  id?: string;
  locale: string;
  payload: unknown;
};

// Bề rộng desktop chuẩn của website (ở 1280px, .wrapper đạt max-width 1200px).
const SITE_WIDTH = 1280;

// Preview sống trong 1 tab riêng: render bằng CSS của site (/admin/preview),
// nhận bản nháp qua postMessage, và luôn giữ đúng khổ ngang của website thật
// (1280px, thu nhỏ vừa khung nếu tab hẹp hơn) — không còn cột preview 380px.
export default function PreviewFrame({ section, id = '', locale, payload }: Props) {
  const frameRef = useRef<HTMLIFrameElement | null>(null);
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const [ready, setReady] = useState(false);
  const [box, setBox] = useState({ scale: 1, left: 0, height: 540 });
  const payloadRef = useRef<unknown>(payload);
  payloadRef.current = payload;

  const src = `/admin/preview?section=${encodeURIComponent(section)}&id=${encodeURIComponent(id)}&locale=${encodeURIComponent(locale)}`;

  const post = useCallback(() => {
    const target = frameRef.current?.contentWindow;
    if (!target) return;
    target.postMessage(
      { type: 'cms:preview', section, id, itemId: id, locale, payload: payloadRef.current },
      window.location.origin,
    );
  }, [section, id, locale]);

  useEffect(() => {
    function measure() {
      const element = bodyRef.current;
      if (!element) return;
      const available = element.clientWidth || SITE_WIDTH;
      const scale = Math.min(1, available / SITE_WIDTH);
      setBox({
        scale,
        left: Math.max(0, Math.round((available - SITE_WIDTH * scale) / 2)),
        height: Math.max(360, element.clientHeight || 540),
      });
    }
    measure();
    window.addEventListener('resize', measure);
    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(measure) : null;
    if (observer && bodyRef.current) observer.observe(bodyRef.current);
    return () => {
      window.removeEventListener('resize', measure);
      observer?.disconnect();
    };
  }, []);

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type !== 'cms:preview-ready') return;
      setReady(true);
      post();
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [post]);

  // Gõ liên tục thì chỉ đẩy bản nháp mới nhất, tránh render mỗi ký tự.
  useEffect(() => {
    if (!ready) return;
    const timer = window.setTimeout(post, 120);
    return () => window.clearTimeout(timer);
  }, [payload, ready, post]);

  return (
    <div className="preview-tab">
      <div className="preview-tab-head">
        <span>
          Preview · khổ website thật {SITE_WIDTH}px
          {box.scale < 1 ? ` · thu nhỏ ${Math.round(box.scale * 100)}% cho vừa tab` : ''} · {locale.toUpperCase()}
        </span>
        <a href={src} target="_blank" rel="noreferrer">Mở tab riêng ↗</a>
      </div>
      <div className="preview-tab-body" ref={bodyRef}>
        <iframe
          ref={(node) => { frameRef.current = node; }}
          key={src}
          src={src}
          title="Preview website"
          style={{
            width: SITE_WIDTH,
            height: Math.round(box.height / box.scale),
            left: box.left,
            transform: `scale(${box.scale})`,
          }}
          onLoad={() => { setReady(true); post(); }}
        />
      </div>
    </div>
  );
}

export function ViewTabs({ value, onChange }: { value: 'edit' | 'preview'; onChange: (next: 'edit' | 'preview') => void }) {
  return (
    <div className="view-tabs">
      <button type="button" className={`view-tab ${value === 'edit' ? 'active' : ''}`} onClick={() => onChange('edit')}>Nội dung</button>
      <button type="button" className={`view-tab ${value === 'preview' ? 'active' : ''}`} onClick={() => onChange('preview')}>Preview</button>
    </div>
  );
}
