import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import LocaleTabs from '../LocaleTabs';
import MediaUploader from '../MediaUploader';
import MediaGallery from '../MediaGallery';
import SaveBar from '../SaveBar';
import { store, type Locale, type SectionPayload } from '../../../lib/cms/client';

type Status = { kind: 'ok' | 'error'; message: string } | null;

const EMPTY = { title: '', tagline: '', intro: '', logo: '', heroImages: [] as string[] };

export default function HomeEditor() {
  const [locale, setLocale] = useState<Locale>('vi');
  const [data, setData] = useState<SectionPayload | null>(null);
  const [status, setStatus] = useState<Status>(null);
  const [savedAt, setSavedAt] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loaded = store.get('home');
    if (!loaded) { setData(loaded); return; }
    // Ảnh dùng chung: ô nào trống thì lấy từ ngôn ngữ khác.
    const codes: Locale[] = ['vi', 'en', 'fr'];
    for (const field of ['logo', 'heroImages'] as const) {
      const source = codes.map((code) => loaded[code]?.[field]).find((value) => (Array.isArray(value) ? value.length : Boolean(value)));
      if (!source) continue;
      for (const code of codes) {
        const value = loaded[code]?.[field];
        if (Array.isArray(value) ? value.length === 0 : !value) {
          if (loaded[code]) loaded[code] = { ...loaded[code], [field]: source };
        }
      }
    }
    setData(loaded);
    setStatus(null);
  }, []);

  if (!data) return null;

  const payload = { ...EMPTY, ...(data[locale] || {}) };
  const heroImages = Array.isArray(payload.heroImages) ? payload.heroImages : [];
  const present = Object.fromEntries(
    (['vi', 'en', 'fr'] as Locale[]).map((code) => [code, Boolean(data[code]?.title)]),
  ) as Record<Locale, boolean>;

  function update(patch: Record<string, unknown>) {
    setData((current) => {
      if (!current) return current;
      const next = { ...current, [locale]: { ...current[locale], ...patch } };
      // Ảnh dùng chung 3 ngôn ngữ; chữ thì mỗi ngôn ngữ tự nhập.
      if ('logo' in patch || 'heroImages' in patch) {
        for (const code of ['vi', 'en', 'fr'] as Locale[]) {
          if (code === locale || !next[code]) continue;
          next[code] = {
            ...next[code],
            ...('logo' in patch ? { logo: patch.logo } : {}),
            ...('heroImages' in patch ? { heroImages: patch.heroImages } : {}),
          };
        }
      }
      return next;
    });
  }

  async function save() {
    if (!data) return;
    setSaving(true);
    try {
      await store.saveSection('home', data);
      const stamp = new Date().toISOString();
      setSavedAt(stamp);
      setStatus({ kind: 'ok', message: 'Đã lưu trang chủ vào D1. Website cập nhật ngay.' });
      window.setTimeout(() => setStatus(null), 3500);
    } catch (error: any) {
      setStatus({ kind: 'error', message: error?.message || 'Lưu thất bại.' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow"><Link to="/">← Tổng quan</Link> / Trang chủ</div>
          <h1>Trang chủ</h1>
          <p className="subtle">Logo, tên, tagline, lời chào và ảnh hero — mỗi ngôn ngữ một bộ, không có field cứng.</p>
        </div>
        <LocaleTabs value={locale} onChange={setLocale} present={present} />
      </div>

      <div className="editor-grid">
        <div>
          <div className="card">
            <div className="card-head"><h2>Nhận diện</h2><span className="subtle">hiển thị ở header và màn hình mở đầu</span></div>
            <div className="field"><label>Tên hiển thị</label>
              <input className="input" value={payload.title} onChange={(event) => update({ title: event.target.value })} placeholder="ngô nhật trường" />
            </div>
            <div className="field"><label>Tagline</label>
              <input className="input" value={payload.tagline} onChange={(event) => update({ tagline: event.target.value })} placeholder="người làm phim, làm vườn, viết…" />
            </div>
            <div className="field"><label>Logo (mặc định /home/logo-moc.png)</label>
              <MediaUploader
                label="Logo"
                value={payload.logo || ''}
                onChange={(url) => update({ logo: url })}
                target={{ scope: 'page', page: 'home', locale, kind: 'hero' }}
              />
            </div>
          </div>

          <div className="card">
            <div className="card-head"><h2>Lời chào</h2><span className="subtle">đoạn chữ dưới ảnh hero</span></div>
            <div className="field"><label>Nội dung</label>
              <textarea
                className="input"
                rows={5}
                value={payload.intro}
                onChange={(event) => update({ intro: event.target.value })}
                placeholder="Chào mừng bạn đến với góc nhỏ của Trường…"
              />
            </div>
          </div>

          <div className="card">
            <div className="card-head"><h2>Ảnh hero</h2><span className="subtle">kéo thứ tự để đổi slide</span></div>
            <MediaGallery
              label="Ảnh hero"
              items={heroImages}
              onChange={(items) => update({ heroImages: items })}
              target={{ scope: 'page', page: 'home', locale, kind: 'hero' }}
              kind="hero"
            />
          </div>
        </div>

        <aside>
          <div className="preview-card">
            <div className="preview-label">Preview</div>
            <div style={{ padding: 16 }}>
              {heroImages[0] ? <img src={heroImages[0]} alt="" className="media-preview" /> : <div className="tile-cover tile-cover-type" style={{ height: 140 }}><span>hero</span></div>}
              <div style={{ marginTop: 14, fontFamily: "'Cormorant Garamond', serif", fontSize: 26, lineHeight: 1.2 }}>{payload.title || 'tên hiển thị'}</div>
              <p className="subtle" style={{ marginTop: 6 }}>{payload.tagline || 'tagline'}</p>
              <p style={{ marginTop: 12, fontSize: 14, lineHeight: 1.7, color: '#3d4a40' }}>{payload.intro}</p>
              <div className="subtle" style={{ marginTop: 12 }}>{heroImages.length} ảnh hero · {locale.toUpperCase()}</div>
            </div>
          </div>
        </aside>
      </div>

      <SaveBar
        savedAt={savedAt}
        saving={saving}
        status={status}
        onSave={save}
        liveHref="/#home"
        extra={<button type="button" className="btn ghost" onClick={() => window.open('/#home', '_blank')}>Xem ngoài web ↗</button>}
      />
    </>
  );
}
