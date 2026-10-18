import { env } from 'cloudflare:workers';
import type { APIRoute } from 'astro';
import { CMS_SECTIONS, SECTION_DATA, validateSectionData } from '../../../lib/cms/content.mjs';
import { verifySession } from '../../../lib/cms/auth.mjs';

export const prerender = false;

export const GET: APIRoute = async ({ cookies }) => {
  if (!(await verifySession(cookies.get('admin_session')?.value, env.AUTH_SECRET))) {
    return json({ error: 'Unauthorized' }, 401);
  }
  if (!env?.DB) return json({ error: 'Content database is not configured.' }, 503);

  try {
    const { results } = await env.DB
      .prepare('SELECT section, data, updated_at FROM cms_content')
      .all();
    const stored = new Map((results || []).map((row: any) => [row.section, row]));

    const sections: Record<string, unknown> = {};
    const updatedAt: Record<string, string> = {};
    for (const section of CMS_SECTIONS) {
      const row = stored.get(section);
      let data = SECTION_DATA[section];
      if (row?.data) {
        try {
          const parsed = typeof row.data === 'string' ? JSON.parse(row.data) : row.data;
          if (validateSectionData(section, parsed).valid) data = parsed;
        } catch {
          /* fallback to bundled JSON */
        }
      }
      sections[section] = data;
      updatedAt[section] = row?.updated_at || '';
    }

    return json({
      sections,
      updatedAt,
      mediaBase: env.PUBLIC_MEDIA_BASE_URL || '',
    });
  } catch (error: any) {
    console.error('CMS bootstrap failed:', error);
    return json({ error: 'Không tải được nội dung.' }, 500);
  }
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}
