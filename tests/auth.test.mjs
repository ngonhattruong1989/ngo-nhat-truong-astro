import test from 'node:test';
import assert from 'node:assert/strict';
import { signSession, verifySession } from '../src/lib/cms/auth.mjs';

test('signed session verifies only with its signing secret', async () => {
  const token = await signSession('admin', 'test-secret');
  assert.equal(await verifySession(token, 'test-secret'), true);
  assert.equal(await verifySession(token, 'wrong-secret'), false);
});

test('session rejects missing and malformed tokens', async () => {
  assert.equal(await verifySession(undefined, 'test-secret'), false);
  assert.equal(await verifySession('bad.token.value', 'test-secret'), false);
});

test('session signer refuses an empty secret', async () => {
  await assert.rejects(() => signSession('admin', ''), /AUTH_SECRET/);
});

test('session expires after seven days and rejects future-issued tokens', async () => {
  const now = 1_800_000_000_000;
  const token = await signSession('admin', 'test-secret', now);
  assert.equal(await verifySession(token, 'test-secret', now + 7 * 24 * 60 * 60 * 1000 + 1), false);
  assert.equal(await verifySession(token, 'test-secret', now - 60_001), false);
});
