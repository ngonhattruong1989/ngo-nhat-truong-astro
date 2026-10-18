import { useEffect, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import Shell from './Shell';
import Dashboard from './pages/Dashboard';
import HomeEditor from './pages/HomeEditor';
import FilmsList from './pages/FilmsList';
import FilmEditor from './pages/FilmEditor';
import ItemsList from './pages/ItemsList';
import ItemEditor from './pages/ItemEditor';
import CanvasEditor from './pages/CanvasEditor';
import TranslationsEditor from './pages/TranslationsEditor';
import { hydrate, type CmsBootstrap } from '../../lib/cms/client';
import '../../styles/cms.css';

function Content() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/cms/bootstrap', { credentials: 'same-origin', cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          throw new Error(body.error || `HTTP ${response.status}`);
        }
        return response.json();
      })
      .then((data: CmsBootstrap) => {
        hydrate(data);
        setReady(true);
      })
      .catch((cause: any) => setError(cause?.message || 'Không tải được dữ liệu.'));
  }, []);

  if (error) {
    return (
      <div style={{ padding: 32, fontFamily: 'Inter, system-ui, sans-serif' }}>
        <h1 style={{ fontSize: 20 }}>Không tải được CMS</h1>
        <p style={{ color: '#8c2e24' }}>{error}</p>
        <p><a href="/admin/login">Đăng nhập lại</a></p>
      </div>
    );
  }

  if (!ready) {
    return <div style={{ padding: 32, fontFamily: 'Inter, system-ui, sans-serif', color: '#718078' }}>Đang tải nội dung…</div>;
  }

  return (
    <Routes>
      <Route element={<Shell />}>
        <Route index element={<Dashboard />} />
        <Route path="home" element={<HomeEditor />} />
        <Route path="films" element={<FilmsList />} />
        <Route path="films/:id" element={<FilmEditor />} />
        <Route path="about" element={<CanvasEditor section="about" />} />
        <Route path="contact" element={<CanvasEditor section="contact" />} />
        <Route path="ui-translations" element={<TranslationsEditor />} />
        <Route path=":section" element={<ItemsList />} />
        <Route path=":section/:id" element={<ItemEditor />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter basename="/admin">
      <Content />
    </BrowserRouter>
  );
}
