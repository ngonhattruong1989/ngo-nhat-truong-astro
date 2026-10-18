import { env } from 'cloudflare:workers';
import type { APIRoute } from 'astro';
import { verifySession } from '../../../lib/cms/auth.mjs';

export const prerender = false;

const MAX_BYTES = 25 * 1024 * 1024;

// Chặn SSRF tới mạng nội bộ khi proxy ảnh cho canvas crop.
function isPrivateHost(hostname: string) {
  return (
    /^(localhost|127\.|10\.|192\.168\.|169\.254\.|0\.0\.0\.0|::1|\[::1\])/i.test(hostname) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(hostname)
  );
}

export const GET: APIRoute = async ({ request, cookies }) => {
  if (!(await verifySession(cookies.get('admin_session')?.value, env.AUTH_SECRET))) {
    return json({ error: 'Unauthorized' }, 401);
  }

  const raw = new URL(request.url).searchParams.get('url') || '';
  if (!raw) return json({ error: 'Missing url.' }, 400);

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
  if (!upstream.ok || !type.startsWith('image/')) {
    return json({ error: 'URL không phải ảnh.' }, 502);
  }

  const buffer = await upstream.arrayBuffer();
  if (buffer.byteLength > MAX_BYTES) return json({ error: 'Ảnh vượt 25 MB.' }, 413);

  return new Response(buffer, {
    headers: {
      'content-type': type,
      'cache-control': 'private, max-age=60',
    },
  });
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}
