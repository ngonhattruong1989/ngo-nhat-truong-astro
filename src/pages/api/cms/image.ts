import { env } from 'cloudflare:workers';
import type { APIRoute } from 'astro';
import { verifySession } from '../../../lib/cms/auth.mjs';
import { keyFromUrl, originalKey, isImageKey } from '../../../lib/cms/image-key.mjs';

export const prerender = false;

const MAX_BYTES = 25 * 1024 * 1024;
const CACHE = 'public, max-age=60, must-revalidate';

// Chặn SSRF tới mạng nội bộ khi proxy ảnh cho canvas crop.
function isPrivateHost(hostname: string) {
  return (
    /^(localhost|127\.|10\.|192\.168\.|169\.254\.|0\.0\.0\.0|::1|\[::1\])/i.test(hostname) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(hostname)
  );
}

async function authorized(cookies: any) {
  return verifySession(cookies.get('admin_session')?.value, env.AUTH_SECRET);
}

export const GET: APIRoute = async ({ request, cookies }) => {
  if (!(await authorized(cookies))) return json({ error: 'Unauthorized' }, 401);

  const params = new URL(request.url).searchParams;
  const raw = params.get('url') || '';
  if (!raw) return json({ error: 'Missing url.' }, 400);
  const key = keyFromUrl(raw, env.PUBLIC_MEDIA_BASE_URL);

  if (params.get('meta')) {
    if (!key) return json({ key: '', exists: false, hasOriginal: false, external: true });
    const [head, backup] = await Promise.all([
      env.BUCKET?.head(key),
      env.BUCKET?.head(originalKey(key)),
    ]);
    return json({
      key,
      exists: Boolean(head),
      hasOriginal: Boolean(backup),
      external: false,
      size: head?.size || 0,
      contentType: head?.httpMetadata?.contentType || '',
    });
  }

  let target: URL;
  try {
    target = new URL(raw, request.url);
  } catch {
    return json({ error: 'Invalid url.' }, 400);
  }
  const ownHost = new URL(request.url).host;
  if (!['http:', 'https:'].includes(target.protocol) || (target.host !== ownHost && isPrivateHost(target.hostname))) {
    return json({ error: 'Host không được phép.' }, 400);
  }

  let upstream: Response;
  try {
    upstream = await fetch(target.toString(), { headers: { accept: 'image/*' }, redirect: 'follow' });
  } catch {
    return json({ error: 'Không tải được ảnh.' }, 502);
  }

  const type = upstream.headers.get('content-type') || '';
  if (!upstream.ok || !type.startsWith('image/')) return json({ error: 'URL không phải ảnh.' }, 502);

  const buffer = await upstream.arrayBuffer();
  if (buffer.byteLength > MAX_BYTES) return json({ error: 'Ảnh vượt 25 MB.' }, 413);

  const backup = key ? await env.BUCKET?.head(originalKey(key)) : null;
  return new Response(buffer, {
    headers: {
      'content-type': type,
      'cache-control': 'public, max-age=0, must-revalidate',
      'x-nnt-original': backup ? '1' : '0',
    },
  });
};

// Ghi đè đúng object hiện tại (URL không đổi). Lần đầu crop lưu bản gốc vào .originals/<key>.
export const POST: APIRoute = async ({ request, cookies }) => {
  if (!(await authorized(cookies))) return json({ error: 'Unauthorized' }, 401);
  if (!env?.BUCKET) return json({ error: 'R2 chưa được cấu hình.' }, 503);

  const form = await request.formData();
  const action = String(form.get('action') || 'replace');
  const rawUrl = String(form.get('url') || '');
  const key = keyFromUrl(rawUrl, env.PUBLIC_MEDIA_BASE_URL);
  if (!key || key.startsWith('.') || !isImageKey(key)) {
    return json({ error: 'Chỉ chỉnh được ảnh nằm trong site hoặc R2 của bạn.' }, 400);
  }

  const backupKey = originalKey(key);
  const existingBackup = await env.BUCKET.head(backupKey);

  if (action === 'restore') {
    if (!existingBackup) return json({ error: 'Ảnh này chưa có bản gốc để khôi phục.' }, 404);
    const object = await env.BUCKET.get(backupKey);
    if (!object) return json({ error: 'Không đọc được bản gốc.' }, 500);
    await env.BUCKET.put(key, object.body, {
      httpMetadata: {
        contentType: object.httpMetadata?.contentType || 'image/jpeg',
        cacheControl: CACHE,
      },
    });
    return json({ success: true, key, url: rawUrl, restored: true });
  }

  const file = form.get('file');
  if (!(file instanceof File)) return json({ error: 'Thiếu tệp ảnh.' }, 400);
  if (file.size > MAX_BYTES) return json({ error: 'Ảnh vượt 25 MB.' }, 413);

  if (!existingBackup) {
    const object = await env.BUCKET.get(key);
    if (object) {
      await env.BUCKET.put(backupKey, await object.arrayBuffer(), {
        httpMetadata: {
          contentType: object.httpMetadata?.contentType || 'image/jpeg',
          cacheControl: CACHE,
        },
      });
    } else {
      const asset = await env.ASSETS?.fetch(new URL(`/${key}`, request.url));
      if (!asset || !asset.ok) return json({ error: 'Không tìm thấy ảnh gốc trong site.' }, 404);
      await env.BUCKET.put(backupKey, await asset.arrayBuffer(), {
        httpMetadata: {
          contentType: asset.headers.get('content-type') || 'image/jpeg',
          cacheControl: CACHE,
        },
      });
    }
  }

  await env.BUCKET.put(key, await file.arrayBuffer(), {
    httpMetadata: {
      contentType: file.type || 'image/jpeg',
      cacheControl: CACHE,
    },
  });

  return json({ success: true, key, url: rawUrl, hasOriginal: true });
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}
