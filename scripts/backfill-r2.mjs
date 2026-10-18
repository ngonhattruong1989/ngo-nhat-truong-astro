// Backfill media trong public/ lên R2 và (tuỳ chọn) rewrite JSON sang URL R2.
// Mặc định dry-run: không ghi gì.
//   node scripts/backfill-r2.mjs --dry
//   node scripts/backfill-r2.mjs --commit r2
//   node scripts/backfill-r2.mjs --commit d1
import { readdir, readFile, writeFile, stat } from 'node:fs/promises';
import { join, relative, extname } from 'node:path';
import { spawnSync } from 'node:child_process';

const BUCKET = 'public'; // bucket đang giữ domain public.ngonhattruong.com
const MEDIA_EXT = new Set(['.jpeg', '.jpg', '.png', '.webp', '.gif', '.mp4', '.webm', '.pdf']);
const KIND = { bts: 'bts', still: 'stills' };
const args = process.argv.slice(2);
const commit = args.includes('--commit') ? args[args.indexOf('--commit') + 1] : '';
const dry = !commit;

async function walk(dir, out = []) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) await walk(full, out);
    else if (MEDIA_EXT.has(extname(entry.name).toLowerCase())) out.push(full);
  }
  return out;
}

function keyFor(file) {
  const rel = relative('public', file).split('\\').join('/');
  return rel
    .split('/')
    .map((part) => KIND[part.toLowerCase()] || part)
    .join('/');
}

const skip = process.env.SKIP_KEYS_FILE
  ? new Set(JSON.parse(await readFile(process.env.SKIP_KEYS_FILE, 'utf8')))
  : new Set();

const files = [...(await walk('public/films')), ...(await walk('public/uploads'))];
const entries = [];
for (const file of files) {
  const key = keyFor(file);
  if (skip.has(key)) continue;
  const info = await stat(file);
  entries.push({ file, key, url: `/${key}`, bytes: info.size });
}

const totalMb = (entries.reduce((sum, entry) => sum + entry.bytes, 0) / 1024 / 1024).toFixed(1);
console.log(`files: ${entries.length}, total: ${totalMb} MB`);
for (const entry of entries.slice(0, 5)) console.log('  ', entry.key, (entry.bytes / 1024 / 1024).toFixed(2), 'MB');

if (dry) {
  console.log('\nDRY RUN — không upload, không sửa JSON. Dùng --commit r2 hoặc --commit d1 để thực thi.');
  process.exit(0);
}

if (commit === 'r2') {
  let failed = 0;
  let index = 0;
  for (const entry of entries) {
    index += 1;
    const result = spawnSync(
      'npx',
      ['wrangler', 'r2', 'object', 'put', `${BUCKET}/${entry.key}`, '--file', entry.file, '--remote', '--content-type', contentType(entry.key)],
      { encoding: 'utf8' },
    );
    if (result.status !== 0) {
      failed += 1;
      console.error(`FAILED ${entry.key}\n${(result.stderr || '').slice(0, 400)}`);
    } else {
      console.log(`[${index}/${entries.length}] ${entry.key}`);
    }
  }
  console.log(`uploaded: ${entries.length - failed}, failed: ${failed}`);
  process.exit(failed ? 1 : 0);
}

if (commit === 'd1') {
  const base = process.env.PUBLIC_MEDIA_BASE_URL || 'https://public.ngonhattruong.com';
  const dirs = ['about', 'artwork', 'blog', 'contact', 'films', 'music', 'paintings', 'poetry', 'spaces'];
  let touched = 0;
  for (const name of dirs) {
    const path = `src/data/${name}.json`;
    const raw = await readFile(path, 'utf8');
    let next = raw.replace(/"(\/(?:films|uploads)\/[^"]+)"/g, (match, url) => `"${base}${normalizePath(url)}"`);
    if (next !== raw) { await writeFile(path, next); touched += 1; console.log('rewritten', name); }
  }
  console.log(`sections rewritten: ${touched}. Chạy \`node scripts/seed-remote.mjs\` để đẩy lên D1.`);
}

function normalizePath(url) {
  return url
    .split('/')
    .map((part) => (part === 'BTS' ? 'bts' : part === 'still' ? 'stills' : part))
    .join('/');
}

function contentType(key) {
  const ext = extname(key).toLowerCase();
  return ext === '.png' ? 'image/png'
    : ext === '.webp' ? 'image/webp'
    : ext === '.gif' ? 'image/gif'
    : ext === '.mp4' ? 'video/mp4'
    : ext === '.webm' ? 'video/webm'
    : ext === '.pdf' ? 'application/pdf'
    : 'image/jpeg';
}
