import test from 'node:test';
import assert from 'node:assert/strict';
import { toCollageItem, toCollageSection, sectionUpdateSql } from '../src/lib/cms/layouts.mjs';

test('toCollageItem moves the old html into description and seeds the gallery', () => {
  const item = toCollageItem({
    id: 'blossom-wrap-2025',
    title: 'Blossom wrap',
    thumbnail: 'https://cdn/x.jpg',
    images: [],
    html: '<p>len móc</p>',
    date: '2025',
  });
  assert.equal(item.description, '<p>len móc</p>');
  assert.deepEqual(item.images, ['https://cdn/x.jpg']);
  assert.equal(item.medium, '');
  assert.equal(item.date, '2025');
});

test('toCollageItem keeps an existing description and gallery', () => {
  const item = toCollageItem({
    id: 'a', title: 'A', description: '<p>đã có</p>', images: ['https://cdn/1.jpg', 'https://cdn/2.jpg'], medium: 'len', date: '2016',
  });
  assert.equal(item.description, '<p>đã có</p>');
  assert.deepEqual(item.images, ['https://cdn/1.jpg', 'https://cdn/2.jpg']);
  assert.equal(item.medium, 'len');
});

test('toCollageItem falls back to the excerpt, escaped', () => {
  const item = toCollageItem({ id: 'b', title: 'B', excerpt: 'khăn <len> & mùa đông', thumbnail: '' });
  assert.equal(item.description, '<p>khăn &lt;len&gt; &amp; mùa đông</p>');
  assert.deepEqual(item.images, []);
});

test('toCollageSection flips every locale to collage without touching order', () => {
  const section = {
    vi: { title: 'artwork', layout: 'grid', items: [{ id: 'a', html: '<p>x</p>' }, { id: 'b' }] },
    en: { title: 'artwork', layout: 'grid', items: [{ id: 'a' }] },
    fr: { title: 'artwork', layout: 'grid', items: [] },
  };
  const next = toCollageSection(section);
  for (const locale of ['vi', 'en', 'fr']) assert.equal(next[locale].layout, 'collage');
  assert.deepEqual(next.vi.items.map((item) => item.id), ['a', 'b']);
  assert.equal(section.vi.layout, 'grid', 'không sửa object gốc');
});

test('sectionUpdateSql escapes single quotes for d1 execute', () => {
  const sql = sectionUpdateSql('artwork', { vi: { title: "d'affiche" } });
  assert.match(sql, /^UPDATE cms_content SET data = /);
  assert.match(sql, /d''affiche/);
  assert.match(sql, /WHERE section = 'artwork';/);
});
