import assert from 'node:assert/strict';
import { test } from 'node:test';
import { hashPassword, verifyPassword } from './password.js';
import { createToken, requireAuthSecret, verifyToken } from './token.js';

const secret = 'test-secret-that-is-at-least-32-characters';

test('passwords verify only against their own hash', async () => {
  const hash = await hashPassword('correct horse battery');
  assert.equal(await verifyPassword('correct horse battery', hash), true);
  assert.equal(await verifyPassword('wrong password!!', hash), false);
  assert.equal(await verifyPassword('anything', 'not-a-hash'), false);
  assert.notEqual(hash, await hashPassword('correct horse battery'));
});

test('tokens round-trip and reject tampering, expiry, and wrong secrets', () => {
  const now = Date.now();
  const token = createToken('user-1', secret, 60, now);
  assert.equal(verifyToken(token, secret, now)?.sub, 'user-1');
  assert.equal(verifyToken(token, `${secret}x`, now), null);
  assert.equal(verifyToken(token, secret, now + 61_000), null);

  const [header, , signature] = token.split('.');
  const forgedBody = Buffer.from(
    JSON.stringify({ sub: 'admin', iat: 1, exp: 9_999_999_999 }),
  ).toString('base64url');
  assert.equal(
    verifyToken(`${header}.${forgedBody}.${signature}`, secret),
    null,
  );
  assert.equal(verifyToken('garbage', secret), null);
});

test('a strong signing secret is required', () => {
  assert.throws(() => requireAuthSecret(undefined));
  assert.throws(() => requireAuthSecret('short'));
  assert.equal(requireAuthSecret(secret), secret);
});
