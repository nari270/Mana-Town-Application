import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ServiceUnavailableException } from '@nestjs/common';
import { HealthController } from './health.controller.js';

test('health endpoint reports the API service as healthy', () => {
  const controller = new HealthController({ checkConnection: async () => {} });
  assert.deepEqual(controller.getHealth(), {
    status: 'ok',
    service: 'mana-town-api',
  });
});

test('readiness endpoint checks the database connection', async () => {
  const controller = new HealthController({
    checkConnection: async () => {},
  });
  assert.deepEqual(await controller.getReadiness(), {
    status: 'ok',
    service: 'mana-town-api',
    database: 'ok',
  });
});

test('readiness endpoint reports database outages as unavailable', async () => {
  const controller = new HealthController({
    checkConnection: async () => {
      throw new Error('connection refused');
    },
  });
  await assert.rejects(
    controller.getReadiness(),
    (error: unknown) =>
      error instanceof ServiceUnavailableException && error.getStatus() === 503,
  );
});
