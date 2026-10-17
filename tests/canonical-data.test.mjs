import test from 'node:test';
import assert from 'node:assert/strict';
import { SECTION_DATA, validateSectionData } from '../src/lib/cms/content.mjs';

test('all canonical JSON sections satisfy the CMS content contract', () => {
  for (const [section, data] of Object.entries(SECTION_DATA)) {
    assert.deepEqual(validateSectionData(section, data), { valid: true }, `${section} must be valid`);
  }
});
