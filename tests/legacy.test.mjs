import test from 'node:test';
import assert from 'node:assert/strict';
import { toHtml, sectionsToHtml } from '../src/lib/cms/legacy.mjs';

test('plain text becomes paragraphs with line breaks', () => {
  assert.equal(toHtml('a\nb'), '<p>a<br>b</p>');
  assert.equal(toHtml('a\n\nb'), '<p>a</p><p>b</p>');
});

test('existing html is preserved', () => {
  assert.equal(toHtml('<p>x</p>'), '<p>x</p>');
});

test('null and empty text return empty string', () => {
  assert.equal(toHtml(''), '');
  assert.equal(toHtml(null), '');
  assert.equal(toHtml('   '), '');
});

test('legacy about items become a single html document', () => {
  const html = sectionsToHtml([
    { title: '', content: 'Xin chào' },
    { title: 'Học vấn', content: '2013\nTốt nghiệp' },
  ]);
  assert.equal(html, '<p>Xin chào</p><h3>Học vấn</h3><p>2013<br>Tốt nghiệp</p>');
});
