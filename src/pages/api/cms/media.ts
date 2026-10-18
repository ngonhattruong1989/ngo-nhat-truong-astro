import { env } from 'cloudflare:workers';
import type { APIRoute } from 'astro';
import { verifySession } from '../../../lib/cms/auth.mjs';
import { deleteObject, isSafeMediaKey } from '../../../lib/cms/r2.mjs';

export const prerender = false;

export const DELETE: APIRoute = async ({ request, cookies }) => {
  if (!(await verifySession(cookies.get('admin_session')?.value, env.AUTH_SECRET))) {
    return json({ error: 'Unauthorized' }, 401);
  }
  const key = new URL(request.url).searchParams.get('key') || '';
  if (!isSafeMediaKey(key)) return json({ error: 'Invalid media key' }, 400);
  if (!env?.BUCKET) return json({ error: 'Media storage is not configured.' }, 503);

  try {
    await deleteObject(env.BUCKET, key);
    return json({ success: true, key });
  } catch (error: any) {
    console.error('CMS media delete failed:', error);
    return json({ error: 'Không thể xoá tệp.' }, 500);
  }
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}
