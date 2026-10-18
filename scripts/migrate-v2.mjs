// Chuyển dữ liệu seed sang schema v2: about/contact → html, item → html.
// Chạy một lần: node scripts/migrate-v2.mjs
import { readFile, writeFile } from 'node:fs/promises';
import { itemsToCanvasHtml, legacyHtml } from '../src/lib/cms/legacy.mjs';

const LOCALES = ['vi', 'en', 'fr'];
const CANVAS = ['about', 'contact'];
const SECTIONS = ['about', 'artwork', 'blog', 'contact', 'films', 'music', 'paintings', 'poetry', 'spaces'];

for (const name of SECTIONS) {
  const path = `src/data/${name}.json`;
  const data = JSON.parse(await readFile(path, 'utf8'));
  let changed = false;

  for (const locale of LOCALES) {
    const payload = data[locale];
    if (!payload) continue;

    if (CANVAS.includes(name)) {
      if (typeof payload.html !== 'string' || !payload.html.trim()) {
        payload.html = itemsToCanvasHtml(payload.items);
        changed = true;
      }
      continue;
    }

    for (const item of payload.items || []) {
      if (name === 'films') {
        if (item.videoUrl === undefined) { item.videoUrl = ''; changed = true; }
        continue;
      }
      // paintings: `description` đã là HTML, bodyHtml tự fallback — không nhân bản.
      if (name === 'paintings') continue;
      if (typeof item.html !== 'string' || !item.html.trim()) {
        if (item.content) { item.html = legacyHtml(item.content); changed = true; }
      }
    }
  }

  if (changed) {
    await writeFile(path, `${JSON.stringify(data, null, 2)}\n`);
    console.log(`${name}: migrated`);
  } else {
    console.log(`${name}: unchanged`);
  }
}
