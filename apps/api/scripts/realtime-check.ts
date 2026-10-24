import { PrismaClient } from '@prisma/client';
import { createRealtime } from '@neon/realtime/server';
import {
  approvedBusinessesQuery,
  databaseNameFromUrl,
} from '../src/realtime/realtime.service.js';

// End-to-end Neon Realtime check: subscribe to the live query, then write a row
// through Postgres and wait for the change to arrive over the WebSocket.
async function main() {
  const { NEON_REALTIME_SECRET, NEON_REALTIME_URL, DATABASE_URL } = process.env;
  if (!NEON_REALTIME_SECRET || !NEON_REALTIME_URL || !DATABASE_URL) {
    throw new Error('Realtime environment variables are missing.');
  }
  const realtime = createRealtime({
    secret: NEON_REALTIME_SECRET,
    url: NEON_REALTIME_URL,
    db: databaseNameFromUrl(DATABASE_URL),
  });
  const prisma = new PrismaClient();
  const name = `Realtime Check ${Date.now()}`;
  let businessId: string | undefined;

  try {
    const subscription = await realtime.subscribe(approvedBusinessesQuery());
    await subscription.awaitRows(() => true, 20_000);
    const before = subscription.getSnapshot().data?.length ?? 0;
    console.log(`subscribed; initial approved businesses: ${before}`);

    const created = await prisma.business.create({
      data: {
        name,
        description: 'Temporary realtime verification row',
        address: '1 Test Street',
        locality: 'Kadiri',
        status: 'APPROVED',
        approvedAt: new Date(),
      },
    });
    businessId = created.id;

    await subscription.awaitRows(
      (rows) => rows.some((row) => row.name === name),
      20_000,
    );
    console.log(`REALTIME OK: received live insert "${name}"`);
    subscription.unsubscribe();
  } finally {
    if (businessId) await prisma.business.delete({ where: { id: businessId } });
    await prisma.$disconnect();
    realtime.close();
  }
}

main().catch((error) => {
  console.error(
    'REALTIME FAILED:',
    error instanceof Error ? error.message : error,
  );
  process.exit(1);
});
