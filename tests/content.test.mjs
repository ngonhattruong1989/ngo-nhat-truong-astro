import test from 'node:test';
import assert from 'node:assert/strict';
import { validateSectionData } from '../src/lib/cms/content.mjs';

test('accepts all three locales with section-shaped content', () => {
  const data = Object.fromEntries(['vi', 'en', 'fr'].map((locale) => [locale, {
    title: locale,
    layout: 'grid',
    description: '',
    items: [{ id: 'item-one', title: 'Item', content: 'Text' }],
  }]));
  assert.deepEqual(validateSectionData('blog', data), { valid: true });
});

test('rejects a section missing a locale or items array', () => {
  assert.equal(validateSectionData('blog', { vi: { title: 'x', items: [] }, en: {}, fr: {} }).valid, false);
});

test('accepts compact about/contact section shapes', () => {
  const data = Object.fromEntries(['vi', 'en', 'fr'].map((locale) => [locale, { title: locale, items: [] }]));
  assert.deepEqual(validateSectionData('about', data), { valid: true });
  assert.deepEqual(validateSectionData('contact', data), { valid: true });
});

test('rejects unknown sections and non-object payloads', () => {
  assert.equal(validateSectionData('unknown', {}).valid, false);
  assert.equal(validateSectionData('films', null).valid, false);
});
