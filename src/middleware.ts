import { defineMiddleware } from 'astro:middleware';
import { env } from 'cloudflare:workers';
import { verifySession } from './lib/cms/auth.mjs';

export const onRequest = defineMiddleware(async (context, next) => {
  const path = context.url.pathname;
  if (!path.startsWith('/admin')) return next();
  const login = path === '/admin/login';
  const valid = await verifySession(context.cookies.get('admin_session')?.value, env.AUTH_SECRET);
  if (!valid && !login) return context.redirect('/admin/login');
  if (valid && login) return context.redirect('/admin');
  return next();
});
