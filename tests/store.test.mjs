import test from 'node:test';
import assert from 'node:assert/strict';
import { getSectionData, saveSectionData, SECTION_DATA } from '../src/lib/cms/content.mjs';

function mockDb(row) {
  const db = { prepare(query) { return { bind(...values) { this.values = values; return this; }, async first() { return row; }, async run() { db.saved = this.values; return { success: true }; } }; } };
  return db;
}

test('loads default content when D1 has no row', async () => {
  const result = await getSectionData('about', mockDb(null));
  assert.deepEqual(result, SECTION_DATA.about);
});

test('reads a persisted section over the bundled default', async () => {
  const changed = structuredClone(SECTION_DATA.about);
  changed.vi.title = 'Đã cập nhật';
  const result = await getSectionData('about', mockDb({ data: JSON.stringify(changed) }));
  assert.equal(result.vi.title, 'Đã cập nhật');
});

test('writes validated content through a parameterized D1 query', async () => {
  const db = mockDb(null);
  const result = await saveSectionData('about', SECTION_DATA.about, db);
  assert.equal(result.valid, true);
  assert.equal(db.saved[0], 'about');
  assert.deepEqual(JSON.parse(db.saved[1]), SECTION_DATA.about);
});

test('does not persist invalid or unknown content', async () => {
  const db = mockDb(null);
  assert.equal((await saveSectionData('about', { vi: {} }, db)).valid, false);
  assert.equal((await saveSectionData('missing', {}, db)).valid, false);
  assert.equal(db.saved, undefined);
});
