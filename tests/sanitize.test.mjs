import test from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeHtml } from '../src/lib/cms/sanitize.mjs';

test('keeps allowed formatting and links', () => {
  const out = sanitizeHtml('<p style="text-align: center; line-height: 1.6"><strong>Xin chào</strong> <a href="https://a.com" target="_blank">link</a></p>');
  assert.match(out, /<p style="text-align: center; line-height: 1.6">/);
  assert.match(out, /<strong>Xin chào<\/strong>/);
  assert.match(out, /href="https:\/\/a.com"/);
  assert.match(out, /rel="noopener noreferrer"/);
});

test('drops script/style blocks including their contents', () => {
  assert.equal(sanitizeHtml('<p>a</p><script>alert(1)</script><style>p{}</style>'), '<p>a</p>');
});

test('keeps a youtube embed but drops any other iframe', () => {
  const youtube = sanitizeHtml('<iframe src="https://www.youtube.com/embed/w9I_AQBpKps" width="560" height="315"></iframe>');
  assert.match(youtube, /<iframe src="https:\/\/www\.youtube\.com\/embed\/w9I_AQBpKps"/);
  assert.match(youtube, /allowfullscreen/);
  assert.equal(sanitizeHtml('<iframe src="https://evil.example/x"></iframe>'), '');
  assert.equal(sanitizeHtml('<iframe src="javascript:alert(1)"></iframe>'), '');
});

test('keeps uploaded video and strips handlers, javascript: and non-https sources', () => {
  const out = sanitizeHtml('<video src="https://public.ngonhattruong.com/films/phuc-sinh/video/a-b.mp4" controls loop onerror="alert(1)"></video>');
  assert.match(out, /<video src="https:\/\/public\.ngonhattruong\.com\/films\/phuc-sinh\/video\/a-b\.mp4" controls loop><\/video>/);
  assert.equal(sanitizeHtml('<video src="javascript:alert(1)"></video>'), '<video></video>');
});

test('strips event handlers and javascript: urls', () => {
  const out = sanitizeHtml('<img src="x.jpg" onerror="alert(1)"><a href="javascript:alert(1)">x</a>');
  assert.ok(!out.includes('onerror'));
  assert.ok(!out.includes('javascript:'));
  assert.match(out, /<img src="x.jpg">/);
});

test('drops unknown tags but keeps inner text and escapes raw markup', () => {
  assert.equal(sanitizeHtml('<marquee>hi</marquee> 1 < 2'), 'hi 1 &lt; 2');
});

test('keeps text-align/font-size styles but drops position and url()', () => {
  const out = sanitizeHtml('<p style="font-size: 18px; position: fixed; background: url(x)">x</p>');
  assert.match(out, /font-size: 18px/);
  assert.ok(!out.includes('position'));
  assert.ok(!out.includes('url('));
});

test('keeps the display box of an image (width % + alignment) across a save', () => {
  const out = sanitizeHtml('<img src="x.jpg" data-width="60" data-align="center" style="width:60%;max-width:100%;height:auto;display:block;margin-left:auto;margin-right:auto">');
  assert.match(out, /data-width="60"/);
  assert.match(out, /data-align="center"/);
  assert.match(out, /width: 60%/);
  assert.match(out, /margin-left: auto/);
});

test('drops css expressions and odd units in image geometry', () => {
  const out = sanitizeHtml('<img src="x.jpg" style="width:expression(alert(1));margin-left:url(x);display:fixed">');
  assert.ok(!out.includes('expression'));
  assert.ok(!out.includes('url('));
  assert.ok(!out.includes('display'));
});

test('empty or non-string input returns empty string', () => {
  assert.equal(sanitizeHtml(''), '');
  assert.equal(sanitizeHtml(null), '');
});
