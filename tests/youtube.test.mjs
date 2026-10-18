import test from 'node:test';
import assert from 'node:assert/strict';
import { youtubeId, youtubeEmbed } from '../src/lib/cms/youtube.mjs';

test('keeps a bare youtube id', () => {
  assert.equal(youtubeId('w9I_AQBpKps'), 'w9I_AQBpKps');
});

test('extracts the id from watch, short and embed urls', () => {
  assert.equal(youtubeId('https://www.youtube.com/watch?v=w9I_AQBpKps&t=10s'), 'w9I_AQBpKps');
  assert.equal(youtubeId('https://youtu.be/w9I_AQBpKps'), 'w9I_AQBpKps');
  assert.equal(youtubeId('https://www.youtube.com/embed/w9I_AQBpKps'), 'w9I_AQBpKps');
});

test('builds an embed url only for a valid id', () => {
  assert.equal(youtubeEmbed('https://youtu.be/w9I_AQBpKps'), 'https://www.youtube.com/embed/w9I_AQBpKps');
  assert.equal(youtubeEmbed(''), '');
  assert.equal(youtubeEmbed('not a link'), '');
});
