import { Link } from 'react-router-dom';
import { SECTION_META, SECTION_ORDER } from '../../../lib/cms/sections';
import { previewSrc, store } from '../../../lib/cms/client';

function coverFor(section: string): string {
  if (section === 'films') {
    const first = store.item('films', store.ids('films')[0], 'vi');
    return previewSrc(first?.poster || first?.thumbnail || '');
  }
  const id = store.ids(section)[0];
  if (id) return previewSrc(store.item(section, id, 'vi')?.thumbnail || '');
  return '';
}

export default function Dashboard() {
  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">Không gian quản trị</div>
          <h1>Nội dung website</h1>
          <p className="subtle">Chọn một trang để đi vào danh sách block, rồi bấm vào block để sửa nội dung, media và preview.</p>
        </div>
        <a className="btn ghost" href="http://localhost:4321" target="_blank" rel="noreferrer">Mở website thật ↗</a>
      </div>

      <div className="grid-cards">
        {SECTION_ORDER.map((key) => {
          const meta = SECTION_META[key];
          const cover = coverFor(key);
          const count = meta.kind === 'canvas' || meta.kind === 'translations' ? 3 : store.ids(key).length;
          const unit = meta.kind === 'canvas' || meta.kind === 'translations' ? 'ngôn ngữ' : 'mục';
          const updated = store.updatedAt(key);
          return (
              <Link key={key} className="tile" to={key === 'films' ? '/films' : `/${key}`}>
              <div className={`tile-cover ${cover ? '' : 'tile-cover-type'}`} style={cover ? { backgroundImage: `url(${cover})` } : undefined}>
                {cover ? '' : <span>{meta.label}</span>}
              </div>
              <div className="tile-body">
                <div className="tile-title">{meta.label}</div>
                <div className="tile-meta">
                  <span>{count} {unit}</span>
                  <span>·</span>
                  <span>{updated ? new Date(updated).toLocaleDateString('vi-VN') : 'chưa cập nhật'}</span>
                </div>
                <div className="tile-blurb">{meta.blurb}</div>
              </div>
            </Link>
          );
        })}
      </div>
    </>
  );
}
