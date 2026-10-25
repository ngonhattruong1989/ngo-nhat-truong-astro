// Chuyển section "artwork" sang cách trình bày collage như "Tranh" (idempotent).
//
//   node scripts/migrate-artwork-collage.mjs seed src/data/artwork.json
//   node scripts/migrate-artwork-collage.mjs sql <input.json> <out.sql>
//
// `seed`: ghi lại file seed JSON trong repo.
// `sql` : đọc một dump JSON của D1 (đúng shape { vi, en, fr }) và xuất file .sql
//         để chạy `wrangler d1 execute <db> --remote --file=<out.sql>`.

import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { toCollageSection, sectionUpdateSql } from '../src/lib/cms/layouts.mjs';

const [mode, ...rest] = process.argv.slice(2);

async function readJson(path) {
  return JSON.parse(await readFile(resolve(path), 'utf8'));
}

if (mode === 'seed') {
  const target = rest[0] || 'src/data/artwork.json';
  const before = await readJson(target);
  const after = toCollageSection(before);
  await writeFile(resolve(target), `${JSON.stringify(after, null, 2)}\n`);
  const items = Object.values(after).reduce((total, payload) => total + (payload.items?.length || 0), 0);
  console.log(`seed updated: ${target} · layout=collage · ${items} item/3 locale`);
} else if (mode === 'sql') {
  const input = rest[0];
  const output = rest[1] || '/tmp/artwork-collage.sql';
  if (!input) throw new Error('thiếu file dump JSON');
  const after = toCollageSection(await readJson(input));
  await writeFile(resolve(output), sectionUpdateSql('artwork', after));
  const items = Object.values(after).reduce((total, payload) => total + (payload.items?.length || 0), 0);
  console.log(`sql written: ${output} · ${items} item/3 locale · ${JSON.stringify(after).length} bytes JSON`);
} else {
  console.log('usage: seed [path] | sql <input.json> [out.sql]');
  process.exitCode = 1;
}
