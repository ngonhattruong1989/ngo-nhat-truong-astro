import { defineMiddleware } from 'astro:middleware';
import { env } from 'cloudflare:workers';
import { verifySession } from './lib/cms/auth.mjs';

const IMAGE_PATH = /\.(jpe?g|png|webp|gif|avif|svg)$/i;
const CACHE = 'public, max-age=60, must-revalidate';

export const onRequest = defineMiddleware(async (context, next) => {
  const path = context.url.pathname;

  // Ảnh đã được crop tại chỗ: object trong R2 trùng key với asset trong repo sẽ thắng.
  if (
    IMAGE_PATH.test(path) &&
    !path.startsWith('/_astro/') &&
    !path.startsWith('/media/') &&
    !path.startsWith('/api/') &&
    !path.startsWith('/admin')
  ) {
    const object = await env.BUCKET?.get(path.slice(1));
    if (object) {
      return new Response(object.body, {
        headers: {
          'Content-Type': object.httpMetadata?.contentType || 'image/jpeg',
          'Cache-Control': object.httpMetadata?.cacheControl || CACHE,
          'X-Content-Type-Options': 'nosniff',
          ETag: object.httpEtag,
        },
      });
    }
  }

  if (!path.startsWith('/admin')) return next();
  const login = path === '/admin/login';
  const valid = await verifySession(context.cookies.get('admin_session')?.value, env.AUTH_SECRET);
  if (!valid && !login) return context.redirect('/admin/login');
  if (valid && login) return context.redirect('/admin');
  return next();
});
