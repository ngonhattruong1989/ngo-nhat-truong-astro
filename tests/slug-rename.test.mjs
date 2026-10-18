import test from 'node:test';
import assert from 'node:assert/strict';
import { mediaPrefixFor, rewriteItem } from '../src/lib/cms/slug-rename.mjs';

const BASE = 'https://public.ngonhattruong.com';

test('prefix helper differs for films and pages', () => {
  assert.equal(mediaPrefixFor('films', 'phuc-sinh'), 'films/phuc-sinh/');
  assert.equal(mediaPrefixFor('blog', 'ten-blog-1'), 'blog/ten-blog-1/');
});

test('rewrites poster and reports the new key', () => {
  const item = { id: 'phuc-sinh', poster: `${BASE}/films/phuc-sinh/poster/a.jpg` };
  const { item: next, movedKeys } = rewriteItem(item, 'films', 'phuc-sinh', 'phuc-sinh-2');
  assert.equal(next.poster, `${BASE}/films/phuc-sinh-2/poster/a.jpg`);
  assert.deepEqual(movedKeys, ['films/phuc-sinh-2/poster/a.jpg']);
});

test('rewrites arrays and html inside one item', () => {
  const item = {
    stills: [`${BASE}/films/phuc-sinh/stills/a.jpg`, `${BASE}/films/phuc-sinh/stills/b.jpg`],
    crew: `<p><img src="${BASE}/films/phuc-sinh/bts/c.jpg"></p>`,
  };
  const { item: next, movedKeys } = rewriteItem(item, 'films', 'phuc-sinh', 'moi');
  assert.deepEqual(next.stills, [`${BASE}/films/moi/stills/a.jpg`, `${BASE}/films/moi/stills/b.jpg`]);
  assert.match(next.crew, /films\/moi\/bts\/c\.jpg/);
  assert.equal(movedKeys.length, 3);
});

test('does not touch external urls or lookalike prefixes', () => {
  const item = {
    thumbnail: 'https://cdn.other.com/films/phuc-sinh/poster/a.jpg',
    other: `${BASE}/films/phuc-sinh-2/poster/a.jpg`,
    title: 'phuc-sinh',
  };
  const { item: next, movedKeys } = rewriteItem(item, 'films', 'phuc-sinh', 'phuc-sinh-3');
  assert.equal(next.thumbnail, 'https://cdn.other.com/films/phuc-sinh/poster/a.jpg');
  assert.equal(next.other, `${BASE}/films/phuc-sinh-2/poster/a.jpg`);
  assert.deepEqual(movedKeys, []);
});

test('rewrites page-scoped media and legacy local paths', () => {
  const item = { thumbnail: '/uploads/a.jpeg', images: ['/paintings/x/images/b.jpeg'] };
  const { item: next, movedKeys } = rewriteItem(item, 'paintings', 'x', 'y');
  assert.deepEqual(next.images, ['/paintings/y/images/b.jpeg']);
  assert.deepEqual(movedKeys, ['paintings/y/images/b.jpeg']);
  assert.equal(next.thumbnail, '/uploads/a.jpeg');
});
