import { env } from 'cloudflare:workers';
import type { APIRoute } from 'astro';
import { getSectionData, saveSectionData } from '../../../lib/cms/content.mjs';
import { verifySession } from '../../../lib/cms/auth.mjs';

export const prerender = false;

export const GET: APIRoute = async ({ params }) => {
  const section = params.section || '';
  const data = await getSectionData(section, env.DB);
  if (!data) return new Response(JSON.stringify({ error: 'Unknown section.' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
  return new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
};

export const PUT: APIRoute = async ({ params, request, cookies }) => {
  if (!(await verifySession(cookies.get('admin_session')?.value, env.AUTH_SECRET))) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }
  const section = params.section || '';
  let data;
  try { data = await request.json(); } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON.' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }
  try {
    const result = await saveSectionData(section, data, env?.DB);
    if (!result.valid) {
      const status = result.error === 'Unknown content section.' ? 404 : result.error === 'Content database is not configured.' ? 503 : 400;
      return new Response(JSON.stringify({ error: result.error }), { status, headers: { 'Content-Type': 'application/json' } });
    }
    return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('CMS save failed:', error);
    return new Response(JSON.stringify({ error: 'Unable to save content.' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};
