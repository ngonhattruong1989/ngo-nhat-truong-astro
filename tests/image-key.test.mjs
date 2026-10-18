import test from 'node:test';
import assert from 'node:assert/strict';
import { keyFromUrl, originalKey, isImageKey } from '../src/lib/cms/image-key.mjs';

const BASE = 'https://public.ngonhattruong.com';

test('keyFromUrl handles public R2 URLs, /media and site-relative paths', () => {
  assert.equal(keyFromUrl(`${BASE}/films/phuc-sinh/poster/a.jpg`, BASE), 'films/phuc-sinh/poster/a.jpg');
  assert.equal(keyFromUrl('/media/uploads/x.png', BASE), 'uploads/x.png');
  assert.equal(keyFromUrl('/uploads/painting-blue-kanon.jpeg', BASE), 'uploads/painting-blue-kanon.jpeg');
  assert.equal(keyFromUrl(`${BASE}/uploads/x.jpeg?v=2`, BASE), 'uploads/x.jpeg');
});

test('keyFromUrl refuses external hosts and empty values', () => {
  assert.equal(keyFromUrl('https://example.com/a.jpg', BASE), '');
  assert.equal(keyFromUrl('', BASE), '');
});

test('originalKey keeps the original in a hidden prefix', () => {
  assert.equal(originalKey('films/a/poster/x.jpg'), '.originals/films/a/poster/x.jpg');
});

test('isImageKey accepts common image extensions only', () => {
  assert.equal(isImageKey('a/b/c.JPEG'), true);
  assert.equal(isImageKey('a/b/c.mp4'), false);
  assert.equal(isImageKey('a/b/c'), false);
});
