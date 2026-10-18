import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { SECTION_META, SECTION_ORDER } from '../../lib/cms/sections';

export default function Shell() {
  const location = useLocation();
  const active = location.pathname.split('/')[1] || '';

  return (
    <div className="shell">
      <aside className="sidebar">
        <div>
          <div className="side-brand">
            <span className="mark">N</span>
            <div>
              <strong>Ngô Nhật Trường</strong>
              <div className="side-brand-sub">CMS · D1 + R2</div>
            </div>
          </div>
          <div className="side-group">
            <div className="side-label">Không gian quản trị</div>
            <NavLink end to="/" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>Tổng quan</NavLink>
          </div>
          <div className="side-group">
            <div className="side-label">Nội dung</div>
            {SECTION_ORDER.filter((key) => SECTION_META[key].kind !== 'translations' && key !== 'contact').map((key) => (
              <NavLink
                key={key}
                to={key === 'films' ? '/films' : key === 'about' ? '/about' : `/${key}`}
                className={() => `nav-link ${active === key ? 'active' : ''}`}
              >
                {SECTION_META[key].label}
              </NavLink>
            ))}
          </div>
          <div className="side-group">
            <div className="side-label">Cấu hình</div>
            <NavLink to="/contact" className={() => `nav-link ${active === 'contact' ? 'active' : ''}`}>Liên hệ</NavLink>
            <NavLink to="/ui-translations" className={() => `nav-link ${active === 'ui-translations' ? 'active' : ''}`}>Bản dịch giao diện</NavLink>
          </div>
        </div>
        <div className="side-foot">
          <a className="link-button" href="/" target="_blank" rel="noreferrer">Mở website ↗</a>
          <form method="POST" action="/api/auth/logout" style={{ margin: 0 }}>
            <button type="submit" className="link-button">Đăng xuất</button>
          </form>
          <div>Nội dung lưu ở Cloudflare D1, media ở R2.</div>
        </div>
      </aside>
      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
