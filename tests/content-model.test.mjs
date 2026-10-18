import test from 'node:test';
import assert from 'node:assert/strict';
import {
  sectionIds, itemsFor, upsertItem, removeItem, removeEverywhere, reorderItem,
  createEmptyFilm, createEmptyItem, validateV2,
} from '../src/lib/cms/content-model.mjs';

const films = {
  vi: { title: 'phim', items: [{ id: 'phuc-sinh' }, { id: 'hai-chu-chau' }, { id: 'ba-oi-dung-noi-doi' }] },
  en: { title: 'films', items: [{ id: 'phuc-sinh' }, { id: 'hai-chu-chau' }] },
  fr: { title: 'films', items: [{ id: 'phuc-sinh' }] },
};

test('sectionIds returns the union across locales, in first-seen order', () => {
  assert.deepEqual(sectionIds(films), ['phuc-sinh', 'hai-chu-chau', 'ba-oi-dung-noi-doi']);
});

test('itemsFor returns only the items present in that locale', () => {
  assert.deepEqual(itemsFor(films, 'fr').map((i) => i.id), ['phuc-sinh']);
  assert.deepEqual(itemsFor({}, 'vi'), []);
});

test('upsertItem updates one locale without touching others', () => {
  const next = upsertItem(films, 'en', { id: 'phuc-sinh', title: 'Resurrection' });
  assert.equal(next.en.items[0].title, 'Resurrection');
  assert.deepEqual(next.vi, films.vi);
  assert.deepEqual(next.fr, films.fr);
});

test('upsertItem appends a new id and keeps existing order', () => {
  const next = upsertItem(films, 'vi', { id: 'phuc-sinh', title: 'A' }, { append: false });
  assert.equal(next.vi.items.length, 3);
  const added = upsertItem(films, 'vi', { id: 'new-film', title: 'New' });
  assert.equal(added.vi.items.at(-1).id, 'new-film');
});

test('removeItem deletes only within the given locale', () => {
  const next = removeItem(films, 'vi', 'hai-chu-chau');
  assert.deepEqual(next.vi.items.map((i) => i.id), ['phuc-sinh', 'ba-oi-dung-noi-doi']);
  assert.equal(next.en.items.length, 2);
});

test('removeEverywhere deletes the id from all three locales', () => {
  const next = removeEverywhere(films, 'hai-chu-chau');
  assert.deepEqual(next.vi.items.map((i) => i.id), ['phuc-sinh', 'ba-oi-dung-noi-doi']);
  assert.deepEqual(next.en.items.map((i) => i.id), ['phuc-sinh']);
  assert.deepEqual(next.fr.items.map((i) => i.id), ['phuc-sinh']);
  assert.equal(sectionIds(next).includes('hai-chu-chau'), false);
});

test('reorderItem swaps within one locale only', () => {
  const next = reorderItem(films, 'vi', 'hai-chu-chau', 'up');
  assert.deepEqual(next.vi.items.map((i) => i.id), ['hai-chu-chau', 'phuc-sinh', 'ba-oi-dung-noi-doi']);
  assert.deepEqual(next.en.items.map((i) => i.id), ['phuc-sinh', 'hai-chu-chau']);
});

test('createEmptyFilm builds a locale item with the required fields', () => {
  const film = createEmptyFilm('phim-moi', 'Phim mới');
  assert.deepEqual(Object.keys(film).sort(), ['bts', 'crew', 'duration', 'genre', 'id', 'poster', 'stills', 'thumbnail', 'title', 'videoUrl', 'year', 'youtubeId']);
});

test('createEmptyItem builds an item with html field', () => {
  const item = createEmptyItem('bai-moi', 'Bài mới');
  assert.deepEqual(item, { id: 'bai-moi', title: 'Bài mới', thumbnail: '', date: '', excerpt: '', html: '' });
});

test('validateV2 accepts about html payloads and legacy items', () => {
  assert.equal(validateV2('about', { vi: { html: '<p>x</p>' }, en: {}, fr: {} }).valid, false);
  assert.equal(validateV2('about', { vi: { html: '<p>x</p>' }, en: { html: '' }, fr: { html: '' } }).valid, true);
  assert.equal(validateV2('about', { vi: { items: [] }, en: { items: [] }, fr: { items: [] } }).valid, true);
  assert.equal(validateV2('music', { vi: { title: '', items: [{ id: 'a', html: '<p>x</p>' }] }, en: { items: [] }, fr: { items: [] } }).valid, true);
});

test('validateV2 rejects unknown sections, missing locales and bad ids', () => {
  assert.equal(validateV2('nope', {}).valid, false);
  assert.equal(validateV2('films', null).valid, false);
  assert.equal(validateV2('films', { vi: { items: [] } }).valid, false);
  assert.equal(validateV2('films', { vi: { items: [{ id: 'Bad Id' }] }, en: { items: [] }, fr: { items: [] } }).valid, false);
});
