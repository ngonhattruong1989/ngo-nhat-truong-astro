import test from 'node:test';
import assert from 'node:assert/strict';
import { clampWidth, fitWidth, imageBoxStyle, readAlign, MAX_WIDTH, MIN_WIDTH } from '../src/lib/cms/image-box.mjs';

test('clampWidth keeps the box between 10% and 100%', () => {
  assert.equal(clampWidth(0), MIN_WIDTH);
  assert.equal(clampWidth(45), 45);
  assert.equal(clampWidth(400), MAX_WIDTH);
  assert.equal(clampWidth('60'), 60);
  assert.equal(clampWidth(undefined), MAX_WIDTH);
});

test('fitWidth never upscales above the natural width', () => {
  // ảnh 800px trong cột 1120px → 70% (làm tròn xuống bội số 5)
  assert.equal(fitWidth(800, 1120), 70);
  // ảnh nhỏ hơn cột → 100%, không vượt quá
  assert.equal(fitWidth(4000, 1120), 100);
  // ảnh rất nhỏ vẫn còn khung tối thiểu
  assert.equal(fitWidth(20, 1120), MIN_WIDTH);
  assert.equal(fitWidth(0, 0), MAX_WIDTH);
});

test('imageBoxStyle writes width, max-width and alignment margins', () => {
  assert.equal(
    imageBoxStyle(60, 'center'),
    'width:60%;max-width:100%;height:auto;display:block;margin-left:auto;margin-right:auto',
  );
  assert.match(imageBoxStyle(100, 'right'), /margin-left:auto;margin-right:0$/);
  assert.match(imageBoxStyle(100, 'left'), /margin-left:0;margin-right:auto$/);
  assert.match(imageBoxStyle(100, 'nonsense'), /margin-left:0;margin-right:auto$/);
});

test('readAlign recognises the inline margins of saved HTML', () => {
  assert.equal(readAlign({ style: { marginLeft: 'auto', marginRight: 'auto' }, getAttribute: () => null }), 'center');
  assert.equal(readAlign({ style: { marginLeft: 'auto', marginRight: '0px' }, getAttribute: () => null }), 'right');
  assert.equal(readAlign({ style: {}, getAttribute: () => null }), 'left');
  assert.equal(readAlign({ style: {}, getAttribute: () => 'center' }), 'center');
});
