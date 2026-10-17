import { env } from 'cloudflare:workers';
import type { APIRoute } from 'astro';
import { signSession, SESSION_MAX_AGE } from '../../../lib/cms/auth.mjs';

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies, locals, url }) => {
  if (!env.ADMIN_PASSWORD || !env.AUTH_SECRET) {
    return new Response(JSON.stringify({ error: 'CMS login is not configured.' }), { status: 503, headers: { 'Content-Type': 'application/json' } });
  }
  const form = await request.formData();
  const username = String(form.get('username') || '').trim();
  const password = String(form.get('password') || '');
  const expectedUsername = env.ADMIN_USERNAME || 'admin';
  if (username !== expectedUsername || password !== env.ADMIN_PASSWORD) {
    return new Response(JSON.stringify({ error: 'Tên đăng nhập hoặc mật khẩu không chính xác.' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }
  const token = await signSession(username, env.AUTH_SECRET);
  cookies.set('admin_session', token, {
    path: '/', httpOnly: true, secure: url.protocol === 'https:', sameSite: 'lax', maxAge: SESSION_MAX_AGE,
  });
  return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
};
