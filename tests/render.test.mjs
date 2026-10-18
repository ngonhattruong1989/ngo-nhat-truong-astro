import test from 'node:test';
import assert from 'node:assert/strict';
import { bodyHtml, escapeHtml, filmVideoHTML } from '../src/lib/render.mjs';

test('bodyHtml prefers the v2 html field', () => {
  assert.equal(bodyHtml({ html: '<p>mới</p>', content: 'cũ' }), '<p>mới</p>');
});

test('bodyHtml escapes legacy plain text and keeps line breaks', () => {
  assert.equal(bodyHtml({ content: 'a\nb' }), '<div class="rich-plain">a<br>b</div>');
  assert.equal(bodyHtml({ content: '<b>x</b>' }), '<b>x</b>');
});

test('bodyHtml falls back to description (paintings)', () => {
  assert.equal(bodyHtml({ description: '<p>tranh</p>' }), '<p>tranh</p>');
  assert.equal(bodyHtml({}), '');
  assert.equal(bodyHtml(null), '');
});

test('filmVideoHTML prefers videoUrl over youtubeId', () => {
  const withVideo = filmVideoHTML({ videoUrl: 'https://public.ngonhattruong.com/films/x/video/a.mp4', youtubeId: 'abc123' });
  assert.match(withVideo, /<video src="https:\/\/public\.ngonhattruong\.com\/films\/x\/video\/a\.mp4" controls/);
  const youtube = filmVideoHTML({ youtubeId: 'w9I_AQBpKps' });
  assert.match(youtube, /<iframe src="https:\/\/www\.youtube\.com\/embed\/w9I_AQBpKps"/);
  assert.equal(filmVideoHTML({}), '');
});

test('escapeHtml escapes markup', () => {
  assert.equal(escapeHtml('<a & "b">'), '&lt;a &amp; &quot;b&quot;&gt;');
});
