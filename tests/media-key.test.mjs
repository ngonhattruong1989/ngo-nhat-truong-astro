import test from 'node:test';
import assert from 'node:assert/strict';
import { buildMediaKey, mediaPrefix, mediaUrl, mediaFolder, slugify, assertId } from '../src/lib/cms/media-key.mjs';

const NOW = 1_700_000_000_000;

test('film upload lands in films/<slug>/<kind>/', () => {
  const key = buildMediaKey({ scope: 'film', page: 'films', id: 'phuc-sinh', kind: 'poster', filename: 'Phục Sinh Poster.JPG', mime: 'image/jpeg', now: NOW });
  assert.match(key, /^films\/phuc-sinh\/poster\/[a-z0-9]+-phuc-sinh-poster\.jpg$/);
});

test('item upload lands in <page>/<item-id>/<kind>/', () => {
  const key = buildMediaKey({ scope: 'item', page: 'paintings', id: 'sen-trang1', kind: 'images', filename: 'Sen trắng.png', mime: 'image/png', now: NOW });
  assert.match(key, /^paintings\/sen-trang1\/images\/[a-z0-9]+-sen-trang\.png$/);
});

test('page upload lands in <page>/<locale>/<kind>/', () => {
  const key = buildMediaKey({ scope: 'page', page: 'about', locale: 'vi', kind: 'images', filename: 'me.jpeg', mime: 'image/jpeg', now: NOW });
  assert.match(key, /^about\/vi\/images\/[a-z0-9]+-me\.jpg$/);
});

test('video kind is allowed and keeps mp4 extension', () => {
  const key = buildMediaKey({ scope: 'film', page: 'films', id: 'phuc-sinh', kind: 'video', filename: 'trailer.mov', mime: 'video/mp4', now: NOW });
  assert.match(key, /^films\/phuc-sinh\/video\/[a-z0-9]+-trailer\.mp4$/);
});

test('rejects path traversal, uppercase ids, unknown kinds and types', () => {
  assert.throws(() => assertId('../etc'), /Invalid/);
  assert.throws(() => assertId('Phuc Sinh'), /Invalid/);
  assert.throws(() => buildMediaKey({ scope: 'film', page: 'films', id: 'phuc-sinh', kind: 'evil', filename: 'a.jpg', mime: 'image/jpeg' }), /kind/);
  assert.throws(() => buildMediaKey({ scope: 'film', page: 'films', id: 'phuc-sinh', kind: 'poster', filename: 'a.exe', mime: 'application/x-msdownload' }), /Unsupported/);
});

test('prefix, folder and public url helpers', () => {
  assert.equal(mediaPrefix({ scope: 'film', page: 'films', id: 'phuc-sinh' }), 'films/phuc-sinh');
  assert.equal(mediaFolder('films/phuc-sinh/bts/abc-x.jpg'), 'films/phuc-sinh/bts');
  assert.equal(mediaUrl('https://public.ngonhattruong.com/', 'films/phuc-sinh/bts/abc-x.jpg'), 'https://public.ngonhattruong.com/films/phuc-sinh/bts/abc-x.jpg');
});

test('slugify handles Vietnamese diacritics', () => {
  assert.equal(slugify('Phục Sinh — Hậu Trường'), 'phuc-sinh-hau-truong');
  assert.equal(slugify('Đường về'), 'duong-ve');
});
