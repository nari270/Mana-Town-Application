import assert from 'node:assert/strict';
import { test } from 'node:test';
import { validateSync } from 'class-validator';
import { LoginDto, RefreshDto, RegisterDto } from './auth.dto.js';
import { getEmailConfirmationRedirectTo } from './auth.service.js';

test('signup confirmation redirects to the configured web login page', () => {
  const originalOrigin = process.env.CLIENT_ORIGIN;
  process.env.CLIENT_ORIGIN =
    'http://localhost:8081,https://manatown-web.onrender.com';
  try {
    assert.equal(
      getEmailConfirmationRedirectTo(),
      'http://localhost:8081/login',
    );
  } finally {
    if (originalOrigin === undefined) delete process.env.CLIENT_ORIGIN;
    else process.env.CLIENT_ORIGIN = originalOrigin;
  }
});

test('login requires a valid email and password', () => {
  const valid = Object.assign(new LoginDto(), {
    email: 'resident@example.com',
    password: 'correct horse battery',
  });
  assert.equal(validateSync(valid).length, 0);

  const invalid = Object.assign(new LoginDto(), {
    email: 'not-an-email',
    password: 'short',
  });
  assert.ok(validateSync(invalid).length > 0);
});

test('registration enforces the public account requirements', () => {
  const valid = Object.assign(new RegisterDto(), {
    email: 'new-user@example.com',
    password: 'correct horse battery',
    displayName: 'New User',
  });
  assert.equal(validateSync(valid).length, 0);

  const invalid = Object.assign(new RegisterDto(), {
    email: 'new-user@example.com',
    password: 'short',
    displayName: 'A',
  });
  assert.ok(validateSync(invalid).length > 0);
});

test('refresh requires a refresh token', () => {
  assert.ok(
    validateSync(Object.assign(new RefreshDto(), { refreshToken: '' })).length,
  );
  assert.equal(
    validateSync(
      Object.assign(new RefreshDto(), { refreshToken: 'refresh-token-value' }),
    ).length,
    0,
  );
});
