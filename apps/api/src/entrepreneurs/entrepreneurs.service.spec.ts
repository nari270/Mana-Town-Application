import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  BusinessStatus,
  EntrepreneurClassificationStatus,
} from '@prisma/client';
import { buildEntrepreneurWhere } from './entrepreneurs.service.js';

test('public entrepreneur results require both approved listing and classification', () => {
  assert.deepEqual(buildEntrepreneurWhere({}), {
    status: BusinessStatus.APPROVED,
    entrepreneur: {
      is: { status: EntrepreneurClassificationStatus.APPROVED },
    },
  });
});
