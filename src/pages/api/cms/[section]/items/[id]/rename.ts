import { env } from 'cloudflare:workers';
import type { APIRoute } from 'astro';
import { getSectionData, saveSectionData } from '../../../../../../lib/cms/content.mjs';
import { sectionIds } from '../../../../../../lib/cms/content-model.mjs';
import { rewriteItem } from '../../../../../../lib/cms/slug-rename.mjs';
import { sanitizeHtml } from '../../../../../../lib/cms/sanitize.mjs';
import { verifySession } from '../../../../../../lib/cms/auth.mjs';
import { copyPrefix, prefixForItem } from '../../../../../../lib/cms/r2.mjs';

export const prerender = false;

const LOCALES = ['vi', 'en', 'fr'];
const ID_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const HTML_FIELDS = ['html', 'crew', 'description'];
const DEFAULT_BASE = 'https://public.ngonhattruong.com';

function clean(item: Record<string, unknown>) {
  const next: Record<string, unknown> = { ...item };
  for (const field of HTML_FIELDS) {
    if (typeof next[field] === 'string') next[field] = sanitizeHtml(next[field] as string);
  }
  return next;
}

export const POST: APIRoute = async ({ params, request, cookies }) => {
  if (!(await verifySession(cookies.get('admin_session')?.value, env.AUTH_SECRET))) {
    return json({ error: 'Unauthorized' }, 401);
  }

  const section = params.section || '';
  const id = params.id || '';
  const body = (await request.json().catch(() => null)) as any;
  const locale = body?.locale;
  const newId = String(body?.newId || '');
  if (!LOCALES.includes(locale)) return json({ error: 'Invalid locale.' }, 400);
  if (!ID_RE.test(newId)) return json({ error: 'Slug không hợp lệ.' }, 400);
  if (!body?.item || typeof body.item !== 'object') return json({ error: 'Invalid item.' }, 400);

  const current = await getSectionData(section, env.DB);
  if (!current) return json({ error: 'Unknown section.' }, 404);
  if (!env?.DB) return json({ error: 'Content database is not configured.' }, 503);

  const item = { ...clean(body.item), id: newId };

  if (newId === id) {
    const saved = await saveSectionData(section, upsert(current, locale, item), env.DB);
    if (!saved.valid) return json({ error: saved.error }, 400);
    return json({ success: true, renamed: false, moved: [] });
  }

  if (sectionIds(current).includes(newId)) {
    return json({ error: `Slug "${newId}" đã tồn tại trong mục này.` }, 409);
  }

  // 1) Copy folder R2 trước. Lỗi ở bước này thì D1 chưa bị chạm.
  let moved: string[] = [];
  if (env?.BUCKET) {
    try {
      const outcome = await copyPrefix(
        env.BUCKET,
        prefixForItem({ section, id }),
        prefixForItem({ section, id: newId }),
      );
      moved = outcome.copied.map((entry) => entry.to);
    } catch (error: any) {
      console.error('CMS rename copy failed:', error);
      return json({ error: `Không thể chuyển folder R2: ${error?.message || 'lỗi không xác định'}. Dữ liệu chưa thay đổi.` }, 502);
    }
  }

  // 2) D1: đổi id + rewrite URL media ở mọi locale.
  const base = env.PUBLIC_MEDIA_BASE_URL || DEFAULT_BASE;
  const next = structuredClone(current);
  for (const loc of LOCALES) {
    const payload = next[loc];
    if (!Array.isArray(payload?.items)) continue;
    payload.items = payload.items.map((entry: any) => {
      if (entry.id !== id) return entry;
      const source = loc === locale ? item : entry;
      const { item: rewritten } = rewriteItem({ ...source, id: newId }, section, id, newId, base);
      return rewritten;
    });
  }

  const saved = await saveSectionData(section, next, env.DB);
  if (!saved.valid) {
    console.error('CMS rename saved R2 copy but D1 rejected:', saved.error);
    return json({ error: `R2 đã copy nhưng D1 từ chối: ${saved.error}`, moved }, 500);
  }

  return json({ success: true, renamed: true, moved });
};

function upsert(current: any, locale: string, item: any) {
  const next = structuredClone(current);
  const items = Array.isArray(next[locale]?.items) ? next[locale].items : [];
  const index = items.findIndex((entry: any) => entry.id === item.id);
  if (index >= 0) items[index] = { ...items[index], ...item };
  else items.push(item);
  next[locale] = { ...next[locale], items };
  return next;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}
