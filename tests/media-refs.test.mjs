import test from 'node:test';
import assert from 'node:assert/strict';
import { keysFromHtml, keysFromItem, keysToDelete } from '../src/lib/cms/media-refs.mjs';

const BASE = 'https://public.ngonhattruong.com';

test('extracts media keys from html attributes only', () => {
  const html = '<p>x</p><img src="https://public.ngonhattruong.com/blog/ten-blog-1/images/a.jpg"><video src="https://public.ngonhattruong.com/blog/ten-blog-1/video/b.mp4" controls></video>';
  assert.deepEqual(keysFromHtml(html, BASE), ['blog/ten-blog-1/images/a.jpg', 'blog/ten-blog-1/video/b.mp4']);
});

test('ignores text that merely looks like a url and external hosts', () => {
  const html = '<p>https://public.ngonhattruong.com/x/y.jpg</p><img src="https://cdn.other.com/a.jpg"><img src="/uploads/local.png">';
  assert.deepEqual(keysFromHtml(html, BASE), ['uploads/local.png']);
});

test('walks nested item fields, arrays and dedupes', () => {
  const item = {
    poster: `${BASE}/films/phuc-sinh/poster/a.jpg`,
    stills: [`${BASE}/films/phuc-sinh/stills/a.jpg`, `${BASE}/films/phuc-sinh/poster/a.jpg`],
    crew: `<p><img src="${BASE}/films/phuc-sinh/bts/c.jpg"></p>`,
    youtubeId: 'abc',
    title: 'phim',
  };
  assert.deepEqual(keysFromItem(item, BASE).sort(), [
    'films/phuc-sinh/bts/c.jpg',
    'films/phuc-sinh/poster/a.jpg',
    'films/phuc-sinh/stills/a.jpg',
  ]);
});

test('keysToDelete unions references from every locale of the item', () => {
  const items = [
    { id: 'x', thumbnail: `${BASE}/blog/x/thumbnail/1.jpg` },
    { id: 'x', html: `<img src="${BASE}/blog/x/images/2.jpg">` },
  ];
  assert.deepEqual(keysToDelete(items, BASE), ['blog/x/images/2.jpg', 'blog/x/thumbnail/1.jpg']);
});

test('returns [] for empty input', () => {
  assert.deepEqual(keysFromItem(null, BASE), []);
  assert.deepEqual(keysFromHtml('', BASE), []);
  assert.deepEqual(keysToDelete([], BASE), []);
});
