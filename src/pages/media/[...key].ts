import { env } from 'cloudflare:workers';
import type { APIRoute } from 'astro';

export const prerender = false;
const KEY_SEGMENT = /^[A-Za-z0-9._-]+$/;

export const GET: APIRoute = async ({ params }) => {
  const raw = params.key || '';
  const segments = raw.split('/').filter(Boolean);
  const invalid = segments.length === 0
    || raw.startsWith('/')
    || segments.some((segment) => segment === '.' || segment === '..' || !KEY_SEGMENT.test(segment));
  if (invalid) return new Response('Not found', { status: 404 });

  const object = await env.BUCKET?.get(segments.join('/'));
  if (!object) return new Response('Not found', { status: 404 });

  return new Response(object.body, {
    headers: {
      'Content-Type': object.httpMetadata?.contentType || 'application/octet-stream',
      'Cache-Control': object.httpMetadata?.cacheControl || 'public, max-age=60, must-revalidate',
      'X-Content-Type-Options': 'nosniff',
    },
  });
};
