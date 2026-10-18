import { env } from 'cloudflare:workers';
import type { APIRoute } from 'astro';
import { verifySession } from '../../../lib/cms/auth.mjs';
import { buildMediaKey, mediaUrl, MEDIA_KINDS } from '../../../lib/cms/media-key.mjs';

export const prerender = false;
const LIMITS = { image: 15 * 1024 * 1024, video: 60 * 1024 * 1024 };
const ALLOWED_IMAGE = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const ALLOWED_VIDEO = new Set(['video/mp4', 'video/webm']);
const ALLOWED_TYPES = new Set([...ALLOWED_IMAGE, ...ALLOWED_VIDEO]);

export const POST: APIRoute = async ({ request, cookies }) => {
  if (!(await verifySession(cookies.get('admin_session')?.value, env.AUTH_SECRET))) {
    return json({ error: 'Unauthorized' }, 401);
  }
  if (!env?.BUCKET) return json({ error: 'Media storage is not configured.' }, 503);

  try {
    const form = await request.formData();
    const file = form.get('file');
    if (!(file instanceof File)) return json({ error: 'Không tìm thấy tệp tải lên.' }, 400);

    const scope = String(form.get('scope') || '');
    const page = String(form.get('page') || '');
    const id = String(form.get('id') || '');
    const locale = String(form.get('locale') || '');
    const kind = String(form.get('kind') || '');
    if (!['film', 'item', 'page'].includes(scope)) return json({ error: 'Invalid scope.' }, 400);
    if (!MEDIA_KINDS.includes(kind)) return json({ error: 'Invalid media kind.' }, 400);

    const mime = (file.type || '').toLowerCase();
    if (!ALLOWED_TYPES.has(mime)) return json({ error: 'Định dạng không được hỗ trợ.' }, 415);
    const limit = ALLOWED_VIDEO.has(mime) ? LIMITS.video : LIMITS.image;
    if (file.size < 1 || file.size > limit) {
      return json({ error: `Tệp phải nhỏ hơn ${Math.round(limit / 1024 / 1024)} MB.` }, 413);
    }

    const key = buildMediaKey({ scope, page, id, locale, kind, filename: file.name, mime });
    await env.BUCKET.put(key, await file.arrayBuffer(), {
      httpMetadata: { contentType: mime, cacheControl: 'public, max-age=31536000, immutable' },
    });

    const base = env.PUBLIC_MEDIA_BASE_URL || '';
    return json({ success: true, key, url: base ? mediaUrl(base, key) : `/media/${key}` });
  } catch (error: any) {
    console.error('CMS media upload failed:', error);
    const known = /Invalid|Unsupported/.test(error?.message || '');
    return json({ error: known ? error.message : 'Không thể tải tệp lên.' }, known ? 400 : 500);
  }
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}
