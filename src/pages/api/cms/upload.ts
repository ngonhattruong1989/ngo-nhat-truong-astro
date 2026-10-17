import { env } from 'cloudflare:workers';
import type { APIRoute } from 'astro';
import { verifySession } from '../../../lib/cms/auth.mjs';

export const prerender = false;
const MAX_BYTES = 25 * 1024 * 1024;
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm']);
const EXTENSIONS: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif', 'video/mp4': 'mp4', 'video/webm': 'webm' };

export const POST: APIRoute = async ({ request, cookies, url }) => {
  if (!(await verifySession(cookies.get('admin_session')?.value, env.AUTH_SECRET))) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }
  if (!env?.BUCKET) return new Response(JSON.stringify({ error: 'Media storage is not configured.' }), { status: 503, headers: { 'Content-Type': 'application/json' } });
  try {
    const file = (await request.formData()).get('file');
    if (!(file instanceof File)) return new Response(JSON.stringify({ error: 'Không tìm thấy tệp tải lên.' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    const mime = file.type.toLowerCase();
    if (!ALLOWED_TYPES.has(mime)) return new Response(JSON.stringify({ error: 'Định dạng không được hỗ trợ.' }), { status: 415, headers: { 'Content-Type': 'application/json' } });
    if (file.size < 1 || file.size > MAX_BYTES) return new Response(JSON.stringify({ error: 'Tệp phải nhỏ hơn 25 MB.' }), { status: 413, headers: { 'Content-Type': 'application/json' } });
    const key = `${crypto.randomUUID()}.${EXTENSIONS[mime]}`;
    await env.BUCKET.put(key, await file.arrayBuffer(), { httpMetadata: { contentType: mime, cacheControl: 'public, max-age=31536000, immutable' } });
    return new Response(JSON.stringify({ success: true, url: `/media/${key}` }), { headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('CMS media upload failed:', error);
    return new Response(JSON.stringify({ error: 'Không thể tải tệp lên.' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};
