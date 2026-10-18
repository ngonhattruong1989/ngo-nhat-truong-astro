import test from 'node:test';
import assert from 'node:assert/strict';
import { centeredRect, clampRect, resizeRect, moveRect, outputSize, ratioValue, MIN_SIZE } from '../src/lib/cms/crop.mjs';

test('ratioValue resolves presets and the original ratio', () => {
  assert.equal(ratioValue('free', 100, 100), 0);
  assert.equal(ratioValue('16:9', 100, 100), 16 / 9);
  assert.equal(ratioValue('original', 1920, 1080), 1920 / 1080);
});

test('centeredRect fits 16:9 inside a square, centered', () => {
  const rect = centeredRect(1000, 1000, 16 / 9);
  assert.deepEqual(rect, { x: 0, y: 219, w: 1000, h: 563 });
});

test('centeredRect keeps a landscape image untouched for its own ratio', () => {
  assert.deepEqual(centeredRect(1920, 1080, 1920 / 1080), { x: 0, y: 0, w: 1920, h: 1080 });
});

test('clampRect keeps the crop inside the image and above the minimum size', () => {
  assert.deepEqual(clampRect({ x: -50, y: -50, w: 200, h: 200 }, 500, 400), { x: 0, y: 0, w: 200, h: 200 });
  assert.deepEqual(clampRect({ x: 480, y: 380, w: 200, h: 200 }, 500, 400), { x: 300, y: 200, w: 200, h: 200 });
  assert.equal(clampRect({ x: 0, y: 0, w: 1, h: 1 }, 500, 400).w, MIN_SIZE);
});

test('resizeRect keeps the aspect ratio when dragging a corner', () => {
  const start = { x: 100, y: 100, w: 400, h: 400 };
  const next = resizeRect(start, 'se', 100, 10, 1000, 1000, 1);
  assert.equal(next.w, next.h);
  assert.equal(next.x, 100);
  assert.equal(next.y, 100);
  assert.equal(next.w, 500);
});

test('resizeRect without ratio follows the pointer', () => {
  const next = resizeRect({ x: 100, y: 100, w: 200, h: 200 }, 'se', 50, 80, 1000, 1000, 0);
  assert.deepEqual(next, { x: 100, y: 100, w: 250, h: 280 });
});

test('moveRect clamps translation to the image bounds', () => {
  assert.deepEqual(moveRect({ x: 100, y: 100, w: 200, h: 200 }, -500, 20, 800, 600), { x: 0, y: 120, w: 200, h: 200 });
});

test('outputSize caps the exported width', () => {
  assert.deepEqual(outputSize({ w: 4800, h: 2700 }, 2400), { width: 2400, height: 1350 });
  assert.deepEqual(outputSize({ w: 800, h: 600 }, 2400), { width: 800, height: 600 });
});
