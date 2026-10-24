import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../src/prisma/prisma.service.js';

const prisma = new PrismaService();
const demoUserIds = [
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000002',
];
const fixtureIds: string[] = [];

async function main() {
  await prisma.$connect();
  const users = await prisma.user.findMany({
    where: { id: { in: demoUserIds }, authUserId: { not: null } },
    select: { id: true, authUserId: true },
  });
  assert.equal(users.length, 2, 'Seed both demo users before checking RLS.');
  const [first, second] = users;
  assert.ok(first?.authUserId);
  assert.ok(second?.authUserId);

  const ids: [string, string] = [randomUUID(), randomUUID()];
  fixtureIds.push(...ids);
  await prisma.issueReport.createMany({
    data: [
      {
        id: ids[0],
        reference: `RLS-${randomUUID().replaceAll('-', '').slice(0, 24)}`,
        reporterId: first.id,
        title: 'RLS verification fixture',
        description: 'Temporary row for verifying request-scoped RLS.',
        category: 'verification',
        locality: 'Kadiri',
      },
      {
        id: ids[1],
        reference: `RLS-${randomUUID().replaceAll('-', '').slice(0, 24)}`,
        reporterId: second.id,
        title: 'RLS verification fixture',
        description: 'Temporary row for verifying request-scoped RLS.',
        category: 'verification',
        locality: 'Kadiri',
      },
    ],
  });

  const anonymousRows = await prisma.withRequestContext(null, () =>
    prisma.issueReport.findMany({
      where: { id: { in: ids } },
      select: { id: true },
    }),
  );
  assert.deepEqual(anonymousRows, []);

  const firstRows = await prisma.withRequestContext(first.authUserId, () =>
    prisma.issueReport.findMany({
      where: { id: { in: ids } },
      select: { id: true },
    }),
  );
  assert.deepEqual(
    firstRows.map(({ id }) => id),
    [ids[0]],
  );

  const crossUserUpdate = await prisma.withRequestContext(
    second.authUserId,
    () =>
      prisma.issueReport.updateMany({
        where: { id: ids[0] },
        data: { status: 'RESOLVED' },
      }),
  );
  assert.equal(crossUserUpdate.count, 0);

  const untouched = await prisma.issueReport.findUniqueOrThrow({
    where: { id: ids[0] },
    select: { status: true },
  });
  assert.equal(untouched.status, 'SUBMITTED');
  console.log(
    'RLS verified: anonymous denial and cross-user isolation passed.',
  );
}

main()
  .catch((error: unknown) => {
    console.error('RLS verification failed.', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (fixtureIds.length > 0) {
      await prisma.issueReport.deleteMany({
        where: { id: { in: fixtureIds } },
      });
    }
    await prisma.$disconnect();
  });
