import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BadRequestException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { BusinessStatus } from '@prisma/client';
import { BusinessQueryDto } from './business-query.dto.js';
import { BusinessImageStorageService } from './business-image-storage.service.js';
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

test('business location query coordinates must be supplied together', () => {
  for (const input of [{ latitude: '12.3' }, { longitude: '76.5' }]) {
    const query = plainToInstance(BusinessQueryDto, input);
    assert.ok(validateSync(query).length > 0);
  }

  const query = plainToInstance(BusinessQueryDto, {
    latitude: '12.3',
    longitude: '76.5',
  });
  assert.deepEqual(validateSync(query), []);
});

test('business photo storage rejects unsupported file signatures', async () => {
  const storage = new BusinessImageStorageService();
  await assert.rejects(
    storage.upload('business-id', {
      buffer: Buffer.from('not an image'),
      mimetype: 'image/jpeg',
    }),
    BadRequestException,
  );
});
