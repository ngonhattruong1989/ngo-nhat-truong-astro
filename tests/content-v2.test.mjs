import test from 'node:test';
import assert from 'node:assert/strict';
import { validateSectionData, CANVAS_SECTIONS, getSectionUpdatedAt } from '../src/lib/cms/content.mjs';

test('about and contact are canvas sections', () => {
  assert.equal(CANVAS_SECTIONS.has('about'), true);
  assert.equal(CANVAS_SECTIONS.has('contact'), true);
});

test('accepts canvas payloads with html per locale', () => {
  const data = {
    vi: { title: 'về tôi', html: '<p>Xin chào</p>' },
    en: { title: 'about', html: '' },
    fr: { title: 'à propos', html: '<p>bonjour</p>' },
  };
  assert.deepEqual(validateSectionData('about', data), { valid: true });
  assert.deepEqual(validateSectionData('contact', data), { valid: true });
});

test('rejects canvas locales without html or legacy items', () => {
  const data = { vi: { html: '<p>x</p>' }, en: {}, fr: { html: '' } };
  const result = validateSectionData('about', data);
  assert.equal(result.valid, false);
  assert.match(result.error, /html|locale/i);
});

test('rejects non-string html', () => {
  const data = { vi: { html: 5 }, en: { html: '' }, fr: { html: '' } };
  assert.equal(validateSectionData('about', data).valid, false);
});

test('accepts item html and rejects items without a valid id', () => {
  const ok = { vi: { title: 'blog', items: [{ id: 'bai-1', html: '<p>x</p>' }] }, en: { title: 'blog', items: [] }, fr: { title: 'blog', items: [] } };
  assert.deepEqual(validateSectionData('blog', ok), { valid: true });
  const bad = { vi: { title: 'blog', items: [{ html: '<p>x</p>' }] }, en: { title: 'blog', items: [] }, fr: { title: 'blog', items: [] } };
  assert.match(validateSectionData('blog', bad).error, /item id/i);
});

test('getSectionUpdatedAt returns empty string without db and reads the row otherwise', async () => {
  assert.equal(await getSectionUpdatedAt('about', undefined), '');
  const db = { prepare: () => ({ bind: () => ({ first: async () => ({ updated_at: '2026-10-18 10:00:00' }) }) }) };
  assert.equal(await getSectionUpdatedAt('about', db), '2026-10-18 10:00:00');
  const broken = { prepare: () => { throw new Error('no table'); } };
  assert.equal(await getSectionUpdatedAt('about', broken), '');
});
