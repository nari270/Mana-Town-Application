import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BusinessStatus } from '@prisma/client';
import { buildBusinessWhere } from './businesses.service.js';

test('public business filters always constrain results to approved listings', () => {
  assert.deepEqual(buildBusinessWhere({}), {
    status: BusinessStatus.APPROVED,
  });
});

test('business search combines user filters without changing the public status', () => {
  const where = buildBusinessWhere({
    search: '  tailoring  ',
    category: 'women-owned',
    locality: 'Kadiri',
  });

  assert.equal(where.status, BusinessStatus.APPROVED);
  assert.deepEqual(where.locality, {
    contains: 'Kadiri',
    mode: 'insensitive',
  });
  assert.deepEqual(where.categories, {
    some: {
      category: { slug: { equals: 'women-owned', mode: 'insensitive' } },
    },
  });
  assert.deepEqual(where.OR, [
    { name: { contains: 'tailoring', mode: 'insensitive' } },
    { description: { contains: 'tailoring', mode: 'insensitive' } },
    { address: { contains: 'tailoring', mode: 'insensitive' } },
  ]);
});
