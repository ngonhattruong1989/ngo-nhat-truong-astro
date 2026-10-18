// Đồng bộ ảnh/video của mọi mục sang 3 ngôn ngữ (lấy bản vi làm chuẩn).
//   node scripts/sync-media-d1.mjs --local --dry
//   node scripts/sync-media-d1.mjs --local
//   node scripts/sync-media-d1.mjs --remote
import { spawnSync } from 'node:child_process';
import { writeFile, mkdir } from 'node:fs/promises';
import { syncItemMedia, syncHomeMedia } from '../src/lib/cms/media-sync.mjs';

const DB = 'ngo-nhat-truong-cms';
const remote = process.argv.includes('--remote');
const dry = process.argv.includes('--dry');
const scope = remote ? '--remote' : '--local';

const result = spawnSync('npx', ['wrangler', 'd1', 'execute', DB, scope, '--json', '--command', 'SELECT section, data FROM cms_content'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
if (result.status !== 0) { console.error(result.stderr || result.stdout); process.exit(1); }
const rows = JSON.parse(result.stdout.slice(result.stdout.indexOf('[')))[0].results;

const updates = [];
for (const row of rows) {
  let data;
  try { data = JSON.parse(row.data); } catch { continue; }
  let next = data;
  if (row.section === 'home') next = syncHomeMedia(data, 'vi');
  else if (Array.isArray(data.vi?.items)) {
    for (const item of data.vi.items) next = syncItemMedia(next, 'vi', item, { create: false });
  }
  if (JSON.stringify(next) !== JSON.stringify(data)) updates.push({ section: row.section, data: next });
}

console.log(`${remote ? 'remote' : 'local'}: ${updates.length} section(s) cần đồng bộ ảnh`, updates.map((u) => u.section).join(', '));
if (dry || updates.length === 0) process.exit(0);

await mkdir('.tmp', { recursive: true });
const sql = updates.map(({ section, data }) =>
  `UPDATE cms_content SET data = '${JSON.stringify(data).replace(/'/g, "''")}', updated_at = datetime('now') WHERE section = '${section}';`,
).join('\n');
await writeFile('.tmp/sync-media.sql', `${sql}\n`);

const applied = spawnSync('npx', ['wrangler', 'd1', 'execute', DB, scope, '--file=.tmp/sync-media.sql', '--yes'], { stdio: 'inherit' });
process.exit(applied.status ?? 1);
