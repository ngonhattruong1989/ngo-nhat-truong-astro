// Seed D1 remote từ src/data/*.json (schema v2). Chạy sau khi backfill R2 + rewrite URL.
//   node scripts/seed-remote.mjs --dry
//   node scripts/seed-remote.mjs --commit
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';

const DB = 'ngo-nhat-truong-cms';
const SECTIONS = ['about', 'artwork', 'blog', 'contact', 'films', 'music', 'paintings', 'poetry', 'spaces', 'ui-translations'];
const commit = process.argv.includes('--commit');

const statements = [];
for (const section of SECTIONS) {
  const data = JSON.parse(await readFile(`src/data/${section}.json`, 'utf8'));
  const payload = JSON.stringify(data).replace(/'/g, "''");
  statements.push(
    `INSERT INTO cms_content (section, data, updated_at) VALUES ('${section}', '${payload}', datetime('now'))\n` +
      `ON CONFLICT(section) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at;`,
  );
}

await mkdir('.tmp', { recursive: true });
const file = '.tmp/seed.sql';
await writeFile(file, `${statements.join('\n\n')}\n`);
console.log(`sections: ${SECTIONS.length}, sql bytes: ${statements.join('').length}`);

if (!commit) {
  console.log('DRY RUN — chưa ghi D1. Dùng --commit để chạy remote.');
  process.exit(0);
}

const result = spawnSync(
  'npx',
  ['wrangler', 'd1', 'execute', DB, '--remote', `--file=${file}`, '--yes'],
  { stdio: 'inherit' },
);
process.exit(result.status ?? 1);
