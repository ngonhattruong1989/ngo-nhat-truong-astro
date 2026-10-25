import test from 'node:test';
import assert from 'node:assert/strict';
import { syncItemMedia, syncHomeMedia, pickMedia } from '../src/lib/cms/media-sync.mjs';

const base = {
  vi: { items: [{ id: 'sen-trang', title: 'Sen trắng', poster: '', stills: [] }] },
  en: { items: [{ id: 'sen-trang', title: 'White lotus', poster: '', stills: [] }] },
  fr: { items: [] },
};

test('syncItemMedia copies media into existing translations, keeps their text', () => {
  const next = syncItemMedia(base, 'vi', { id: 'sen-trang', title: 'Sen trắng', poster: 'https://x/p.jpg', stills: ['a.jpg'] });
  assert.equal(next.en.items[0].poster, 'https://x/p.jpg');
  assert.deepEqual(next.en.items[0].stills, ['a.jpg']);
  assert.equal(next.en.items[0].title, 'White lotus');
  assert.equal(next.vi.items[0].title, 'Sen trắng');
});

test('syncItemMedia creates the missing translation with media and empty text', () => {
  const next = syncItemMedia(base, 'vi', { id: 'sen-trang', title: 'Sen trắng', poster: 'p.jpg' });
  const fr = next.fr.items.find((item) => item.id === 'sen-trang');
  assert.equal(fr.poster, 'p.jpg');
  assert.equal(fr.title, '');
});

test('syncItemMedia can skip creating missing translations', () => {
  const next = syncItemMedia(base, 'vi', { id: 'sen-trang', poster: 'p.jpg' }, { create: false });
  assert.equal(next.fr.items.length, 0);
});

test('syncItemMedia ignores text-only saves', () => {
  const next = syncItemMedia(base, 'vi', { id: 'sen-trang', title: 'Sen trắng', html: '<p>x</p>' });
  assert.deepEqual(next, base);
});

test('roles are shared across locales like media', () => {
  const next = syncItemMedia(base, 'vi', { id: 'sen-trang', roles: ['actor'] });
  assert.deepEqual(next.en.items[0].roles, ['actor']);
});

test('pickMedia only keeps known media fields', () => {
  assert.deepEqual(pickMedia({ title: 'a', poster: 'p', stills: [] }), { poster: 'p', stills: [] });
});

test('syncHomeMedia copies logo and hero images to every locale', () => {
  const home = {
    vi: { title: 'a', tagline: '', intro: '', logo: 'logo.png', heroImages: ['h1.jpg'] },
    en: { title: 'a', tagline: '', intro: '', logo: '', heroImages: [] },
    fr: { title: 'a', tagline: '', intro: '', logo: '', heroImages: [] },
  };
  const next = syncHomeMedia(home, 'vi');
  assert.equal(next.en.logo, 'logo.png');
  assert.deepEqual(next.fr.heroImages, ['h1.jpg']);
  assert.equal(next.en.title, 'a');
});
