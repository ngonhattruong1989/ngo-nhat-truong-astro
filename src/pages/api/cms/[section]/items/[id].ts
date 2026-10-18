import { env } from 'cloudflare:workers';
import type { APIRoute } from 'astro';
import { getSectionData, saveSectionData } from '../../../../../lib/cms/content.mjs';
import { upsertItem, removeItem, removeEverywhere } from '../../../../../lib/cms/content-model.mjs';
import { sanitizeHtml } from '../../../../../lib/cms/sanitize.mjs';
import { verifySession } from '../../../../../lib/cms/auth.mjs';
import { deletePrefix, prefixForItem } from '../../../../../lib/cms/r2.mjs';
import { syncItemMedia } from '../../../../../lib/cms/media-sync.mjs';

export const prerender = false;

const LOCALES = ['vi', 'en', 'fr'];
const HTML_FIELDS = ['html', 'crew', 'description'];

function clean(item: Record<string, unknown>) {
  const next: Record<string, unknown> = { ...item };
  for (const field of HTML_FIELDS) {
    if (typeof next[field] === 'string') next[field] = sanitizeHtml(next[field] as string);
  }
  return next;
}

export const PATCH: APIRoute = async ({ params, request, cookies }) => {
  if (!(await verifySession(cookies.get('admin_session')?.value, env.AUTH_SECRET))) {
    return json({ error: 'Unauthorized' }, 401);
  }
  const section = params.section || '';
  const id = params.id || '';
  const body = (await request.json().catch(() => null)) as any;
  const locale = body?.locale;
  if (!LOCALES.includes(locale)) return json({ error: 'Invalid locale.' }, 400);
  if (!body?.item || typeof body.item !== 'object') return json({ error: 'Invalid item.' }, 400);

  const current = await getSectionData(section, env.DB);
  if (!current) return json({ error: 'Unknown section.' }, 404);
  if (!env?.DB) return json({ error: 'Content database is not configured.' }, 503);

  const item = { ...clean(body.item), id };
  const upserted = upsertItem(current, locale, item, { append: body.append !== false });
  // Ảnh/video dùng chung 3 ngôn ngữ; chữ giữ riêng từng ngôn ngữ.
  const next = syncItemMedia(upserted, locale, item);
  const result = await saveSectionData(section, next, env.DB);
  if (!result.valid) return json({ error: result.error }, 400);
  return json({ success: true, item });
};

export const DELETE: APIRoute = async ({ params, request, cookies }) => {
  if (!(await verifySession(cookies.get('admin_session')?.value, env.AUTH_SECRET))) {
    return json({ error: 'Unauthorized' }, 401);
  }
  const section = params.section || '';
  const id = params.id || '';
  const url = new URL(request.url);
  const scope = url.searchParams.get('scope') || 'all';
  const locale = url.searchParams.get('locale') || '';
  if (scope !== 'all' && !LOCALES.includes(locale)) return json({ error: 'Invalid locale.' }, 400);

  const current = await getSectionData(section, env.DB);
  if (!current) return json({ error: 'Unknown section.' }, 404);
  if (!env?.DB) return json({ error: 'Content database is not configured.' }, 503);

  // 1) D1 là nguồn sự thật: xoá trước.
  const next = scope === 'all' ? removeEverywhere(current, id) : removeItem(current, locale, id);
  const result = await saveSectionData(section, next, env.DB);
  if (!result.valid) return json({ error: result.error }, 400);

  // 2) R2: xoá folder của mục. Lỗi R2 không rollback D1 nhưng phải báo cho UI.
  const removed: string[] = [];
  const warnings: string[] = [];
  if (scope === 'all' && env?.BUCKET) {
    try {
      const outcome = await deletePrefix(env.BUCKET, prefixForItem({ section, id }));
      removed.push(...outcome.removed);
      warnings.push(...outcome.failed.map((key) => `Không xoá được ${key}`));
    } catch (error: any) {
      warnings.push(`R2: ${error?.message || 'không thể xoá folder'}`);
    }
  }

  return json({ success: true, removedKeys: removed, warnings });
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}
