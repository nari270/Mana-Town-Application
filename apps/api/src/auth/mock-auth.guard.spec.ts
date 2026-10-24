import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isMockAuthenticationAllowed } from './mock-auth.guard.js';

test('mock authentication is limited to explicitly enabled development and test environments', () => {
  assert.equal(isMockAuthenticationAllowed('development', 'true'), true);
  assert.equal(isMockAuthenticationAllowed('test', 'true'), true);
  assert.equal(isMockAuthenticationAllowed('production', 'true'), false);
  assert.equal(isMockAuthenticationAllowed('development', 'false'), false);
  assert.equal(isMockAuthenticationAllowed(undefined, 'true'), false);
});
