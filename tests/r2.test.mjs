import test from 'node:test';
import assert from 'node:assert/strict';
import {
  prefixForItem, isSafeMediaKey, listKeys, deleteKeys, deletePrefix, deleteObject, copyPrefix,
} from '../src/lib/cms/r2.mjs';

function fakeBucket(entries, { failPut } = {}) {
  const store = new Map(Object.entries(entries).map(([key, value]) => [key, {
    body: value.body ?? `body:${key}`,
    httpMetadata: value.httpMetadata ?? { contentType: 'image/jpeg' },
  }]));
  return {
    store,
    async list({ prefix = '', cursor = '0' } = {}) {
      const matched = [...store.keys()].filter((key) => key.startsWith(prefix)).sort();
      const start = Number(cursor || 0);
      const page = matched.slice(start, start + 2);
      return { objects: page.map((key) => ({ key })), truncated: start + 2 < matched.length, cursor: String(start + 2) };
    },
    async get(key) {
      const entry = store.get(key);
      if (!entry) return null;
      return {
        httpMetadata: entry.httpMetadata,
        arrayBuffer: async () => new TextEncoder().encode(entry.body).buffer,
      };
    },
    async put(key, body, options) {
      if (key === failPut) throw new Error('put failed');
      store.set(key, {
        body: new TextDecoder().decode(body),
        httpMetadata: options?.httpMetadata,
      });
    },
    async delete(input) {
      for (const key of Array.isArray(input) ? input : [input]) store.delete(key);
    },
  };
}

test('prefixForItem maps films and pages to their folder', () => {
  assert.equal(prefixForItem({ section: 'films', id: 'phuc-sinh' }), 'films/phuc-sinh/');
  assert.equal(prefixForItem({ section: 'blog', id: 'ten-blog-1' }), 'blog/ten-blog-1/');
  assert.throws(() => prefixForItem({ section: 'blog', id: '../etc' }), /Invalid/);
});

test('isSafeMediaKey rejects traversal, leading slash and odd shapes', () => {
  assert.equal(isSafeMediaKey('films/phuc-sinh/poster/a.jpg'), true);
  assert.equal(isSafeMediaKey('../films/a.jpg'), false);
  assert.equal(isSafeMediaKey('/films/a.jpg'), false);
  assert.equal(isSafeMediaKey('films/../a.jpg'), false);
  assert.equal(isSafeMediaKey('https://x/a.jpg'), false);
  assert.equal(isSafeMediaKey('films//a.jpg'), false);
});

test('listKeys paginates until truncated is false', async () => {
  const bucket = fakeBucket({
    'films/phuc-sinh/poster/1.jpg': {}, 'films/phuc-sinh/poster/2.jpg': {},
    'films/phuc-sinh/bts/3.jpg': {}, 'films/phuc-sinh/bts/4.jpg': {},
    'films/phuc-sinh/bts/5.jpg': {}, 'films/hai-chu-chau/poster/9.jpg': {},
  });
  assert.equal((await listKeys(bucket, 'films/phuc-sinh/')).length, 5);
});

test('deletePrefix removes only keys under the prefix and reports failures', async () => {
  const bucket = fakeBucket({
    'films/phuc-sinh/poster/1.jpg': {}, 'films/phuc-sinh/bts/2.jpg': {}, 'films/hai-chu-chau/poster/9.jpg': {},
  });
  const outcome = await deletePrefix(bucket, 'films/phuc-sinh/');
  assert.deepEqual(outcome.removed.sort(), ['films/phuc-sinh/bts/2.jpg', 'films/phuc-sinh/poster/1.jpg']);
  assert.deepEqual([...bucket.store.keys()], ['films/hai-chu-chau/poster/9.jpg']);
});

test('copyPrefix copies objects with metadata, then removes the old prefix', async () => {
  const bucket = fakeBucket({
    'films/phuc-sinh/poster/a.jpg': { body: 'A', httpMetadata: { contentType: 'image/jpeg' } },
    'films/phuc-sinh/bts/b.mp4': { body: 'B', httpMetadata: { contentType: 'video/mp4' } },
    'films/other/poster/c.jpg': { body: 'C' },
  });
  const { copied } = await copyPrefix(bucket, 'films/phuc-sinh/', 'films/phuc-sinh-moi/');
  assert.equal(copied.length, 2);
  assert.equal(bucket.store.get('films/phuc-sinh-moi/poster/a.jpg').body, 'A');
  assert.equal(bucket.store.get('films/phuc-sinh-moi/poster/a.jpg').httpMetadata.contentType, 'image/jpeg');
  assert.equal(bucket.store.get('films/phuc-sinh-moi/bts/b.mp4').httpMetadata.contentType, 'video/mp4');
  assert.equal(bucket.store.has('films/phuc-sinh/poster/a.jpg'), false);
  assert.equal(bucket.store.has('films/other/poster/c.jpg'), true);
});

test('copyPrefix keeps the old prefix when a copy fails', async () => {
  const bucket = fakeBucket({
    'films/phuc-sinh/poster/a.jpg': { body: 'A' },
    'films/phuc-sinh/bts/b.jpg': { body: 'B' },
  }, { failPut: 'films/new/bts/b.jpg' });
  await assert.rejects(() => copyPrefix(bucket, 'films/phuc-sinh/', 'films/new/'), /put failed/);
  assert.equal(bucket.store.has('films/phuc-sinh/poster/a.jpg'), true);
  assert.equal(bucket.store.has('films/phuc-sinh/bts/b.jpg'), true);
});

test('deleteObject refuses unsafe keys and is idempotent', async () => {
  const bucket = fakeBucket({ 'blog/x/images/a.jpg': {} });
  await assert.rejects(() => deleteObject(bucket, '../.dev.vars'), /Invalid/);
  assert.deepEqual(await deleteObject(bucket, 'blog/x/images/a.jpg'), { key: 'blog/x/images/a.jpg' });
  assert.deepEqual(await deleteObject(bucket, 'blog/x/images/a.jpg'), { key: 'blog/x/images/a.jpg' });
});

test('deleteKeys handles an empty list', async () => {
  assert.deepEqual(await deleteKeys(fakeBucket({}), []), { removed: [], failed: [] });
});
