import { previewSrc } from '../../lib/cms/client';

export function rewriteForPreview(html: string): string {
  return String(html || '').replace(/(src|poster)="(\/(?!site\/|media\/)[^"]*)"/g, (_match, attr: string, path: string) => `${attr}="${previewSrc(path)}"`);
}

type Props = {
  title: string;
  meta?: string;
  html: string;
  cover?: string;
  isFilm?: boolean;
  videoUrl?: string;
  youtubeId?: string;
};

export default function PreviewPane({ title, meta, html, cover, isFilm = false, videoUrl, youtubeId }: Props) {
  return (
    <aside className="preview">
      <div className="preview-head">
        <span>Preview trên website</span>
        <span>chưa lưu</span>
      </div>
      <div className="preview-body">
        <div className="site-preview">
          <h1>{title || 'Chưa có tiêu đề'}</h1>
          {meta ? (
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 11.5, letterSpacing: '.06em', color: '#6b6b6b', textTransform: 'uppercase' }}>
              {meta}
            </p>
          ) : null}
          {isFilm ? (
            <div className="preview-video">
              {videoUrl ? (
                <video src={previewSrc(videoUrl)} controls playsInline style={{ width: '100%' }} />
              ) : youtubeId ? (
                <iframe src={`https://www.youtube.com/embed/${youtubeId}`} title={title} allowFullScreen style={{ width: '100%', aspectRatio: '16/9', border: 0 }} />
              ) : (
                <div className="preview-empty">Chưa có video</div>
              )}
            </div>
          ) : null}
          {cover ? <img src={previewSrc(cover)} alt="" style={{ margin: '18px 0' }} /> : null}
          <div dangerouslySetInnerHTML={{ __html: rewriteForPreview(html) || '<p style="color:#a0a0a0">Chưa có nội dung.</p>' }} />
        </div>
      </div>
    </aside>
  );
}
