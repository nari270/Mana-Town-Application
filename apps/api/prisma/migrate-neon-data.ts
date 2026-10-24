import { PrismaClient } from '@prisma/client';

const sourceUrl = process.env.NEON_DATABASE_URL;
const targetUrl = process.env.SUPABASE_DIRECT_URL;

if (!sourceUrl || !targetUrl) {
  throw new Error('NEON_DATABASE_URL and SUPABASE_DIRECT_URL must be set.');
}

if (sourceUrl === targetUrl) {
  throw new Error('Source and target database URLs must be different.');
}

const source = new PrismaClient({
  datasources: { db: { url: sourceUrl } },
});
const target = new PrismaClient({
  datasources: { db: { url: targetUrl } },
});

const tables = [
  'users',
  'user_profiles',
  'user_roles',
  'business_categories',
  'businesses',
  'business_ownerships',
  'business_category_assignments',
  'business_images',
  'business_hours',
  'business_moderation_history',
  'entrepreneur_classifications',
  'issue_reports',
  'issue_attachments',
  'issue_status_history',
  'issue_internal_notes',
  'advertisement_campaigns',
  'advertisement_assets',
  'advertisement_events',
  'audit_logs',
  'business_views',
  'app_configuration',
  'feature_flags',
] as const;

async function copyTable(table: (typeof tables)[number]) {
  const rows = await source.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT * FROM public."${table}"`,
  );
  const targetColumns = await target.$queryRawUnsafe<
    Array<{ column_name: string; column_type: string }>
  >(
    `SELECT attname AS column_name, format_type(atttypid, atttypmod) AS column_type
     FROM pg_attribute
     WHERE attrelid = 'public."${table}"'::regclass AND attnum > 0 AND NOT attisdropped`,
  );
  const targetTypes = new Map(
    targetColumns.map(({ column_name, column_type }) => [
      column_name,
      column_type,
    ]),
  );
  let copied = 0;

  for (const row of rows) {
    const columns =
      table === 'users'
        ? Object.keys(row).filter(
            (column) => column !== 'username' && column !== 'password_hash',
          )
        : Object.keys(row);
    const values = columns.map((column) => row[column]);
    const columnSql = columns.map((column) => `"${column}"`).join(', ');
    const placeholders = columns
      .map((column, index) => {
        const columnType = targetTypes.get(column);
        if (!columnType) {
          throw new Error(`Target column type is missing: ${table}.${column}`);
        }
        return `$${index + 1}::${columnType}`;
      })
      .join(', ');
    const query = `INSERT INTO public."${table}" (${columnSql}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`;

    await target.$executeRawUnsafe(query, ...values);
    copied++;
  }

  return copied;
}

async function main() {
  const targetTables = await target.$queryRaw<
    Array<{ tablename: string }>
  >`SELECT tablename FROM pg_tables WHERE schemaname = 'public'`;
  const availableTables = new Set(
    targetTables.map(({ tablename }) => tablename),
  );

  for (const table of tables) {
    if (!availableTables.has(table)) {
      throw new Error(`Target table is missing: ${table}`);
    }
  }

  const copied: Record<string, number> = {};
  for (const table of tables) {
    copied[table] = await copyTable(table);
  }

  const sourceAccessLogCount = await source.accessLog.count();
  console.log('Data migration complete.', {
    copied,
    accessLogsExcluded: sourceAccessLogCount,
    userCredentialsExcluded: true,
  });
}

main()
  .catch((error: unknown) => {
    console.error('Neon-to-Supabase data migration failed.', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await source.$disconnect();
    await target.$disconnect();
  });
