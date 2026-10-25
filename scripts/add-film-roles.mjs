// Thêm vai trò cho phim + tách menu thành 2 mục (diễn viên / production designer).
//
//   node scripts/add-film-roles.mjs seed
//   node scripts/add-film-roles.mjs sql <films.json> <ui-translations.json> <out.sql>
//
// `seed`: ghi lại src/data/films.json và src/data/ui-translations.json.
// `sql` : đọc 2 dump JSON của D1 rồi xuất file .sql để chạy
//         `wrangler d1 execute <db> --remote --file=<out.sql>`.

import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { ensureFilmRoles, expandMenu } from '../src/lib/cms/roles.mjs';
import { sectionUpdateSql } from '../src/lib/cms/layouts.mjs';

const [mode, ...rest] = process.argv.slice(2);

async function readJson(path) {
  return JSON.parse(await readFile(resolve(path), 'utf8'));
}

function withMenu(ui, locale) {
  const next = structuredClone(ui);
  for (const code of Object.keys(next)) {
    if (!next[code] || typeof next[code] !== 'object') continue;
    next[code].menu = expandMenu(next[code].menu, code);
  }
  return next;
}

if (mode === 'seed') {
  const filmsPath = restorePath(rest[0], 'src/data/films.json');
  const uiPath = restorePath(rest[1], 'src/data/ui-translations.json');
  const films = ensureFilmRoles(await readJson(filmsPath));
  const ui = withMenu(await readJson(uiPath));
  await writeFile(resolve(filmsPath), `${JSON.stringify(films, null, 2)}\n`);
  await writeFile(resolve(uiPath), `${JSON.stringify(ui, null, 2)}\n`);
  const count = Object.values(films).reduce((total, payload) => total + (payload.items?.length || 0), 0);
  console.log(`seed updated · ${count} item/3 locale · rolePages + roles · menu ${ui.vi.menu.length} mục`);
} else if (mode === 'sql') {
  const [filmsIn, uiIn, out = '/tmp/film-roles.sql'] = rest;
  if (!filmsIn || !uiIn) throw new Error('thiếu dump JSON của films và ui-translations');
  const films = ensureFilmRoles(await readJson(filmsIn));
  const ui = withMenu(await readJson(uiIn));
  await writeFile(resolve(out), sectionUpdateSql('films', films) + sectionUpdateSql('ui-translations', ui));
  console.log(`sql written: ${out} · menu ${ui.vi.menu.length} mục`);
} else {
  console.log('usage: seed [filmsPath] [uiPath] | sql <films.json> <ui-translations.json> [out.sql]');
  process.exitCode = 1;
}

function restorePath(value, fallback) {
  return value || fallback;
}
