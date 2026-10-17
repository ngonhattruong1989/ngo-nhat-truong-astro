import { env } from 'cloudflare:workers';
import type { APIRoute } from 'astro';

export const prerender = false;
export const GET: APIRoute = async ({ params, locals }) => {
  const key = params.key;
  if (!key || key.includes('..') || key.includes('/')) return new Response('Not found', { status: 404 });
  const object = await env.BUCKET?.get(key);
  if (!object) return new Response('Not found', { status: 404 });
  return new Response(object.body, {
    headers: {
      'Content-Type': object.httpMetadata?.contentType || 'application/octet-stream',
      'Cache-Control': object.httpMetadata?.cacheControl || 'public, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
    },
  });
};
