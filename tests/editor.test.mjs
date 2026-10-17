import test from 'node:test';
import assert from 'node:assert/strict';
import { createEditorModel } from '../src/lib/cms/editor.mjs';

test('editing a locale preserves other locales and unknown fields', () => {
  const initial = { vi: { title: 'A', extra: 7 }, en: { title: 'B' }, fr: { title: 'C' } };
  const model = createEditorModel(initial);
  model.set(['vi', 'title'], 'Changed');
  assert.deepEqual(model.value, { vi: { title: 'Changed', extra: 7 }, en: { title: 'B' }, fr: { title: 'C' } });
});

test('model refuses paths that do not exist', () => {
  const model = createEditorModel({ vi: { title: 'A' } });
  assert.throws(() => model.set(['vi', 'missing'], 'x'), /Unknown field/);
});
