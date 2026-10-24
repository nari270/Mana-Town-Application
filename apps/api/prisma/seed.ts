import { PrismaClient, UserRole } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';

const prisma = new PrismaClient();
const demoAccounts = [
  {
    id: '00000000-0000-4000-8000-000000000001',
    email: 'resident@manatown.test',
    passwordEnv: 'SEED_PASSWORD_RESIDENT',
    displayName: 'Demo Customer',
    role: UserRole.CUSTOMER,
  },
  {
    id: '00000000-0000-4000-8000-000000000002',
    email: 'owner@manatown.test',
    passwordEnv: 'SEED_PASSWORD_OWNER',
    displayName: 'Demo Business Owner',
    role: UserRole.BUSINESS_OWNER,
  },
  {
    id: '00000000-0000-4000-8000-000000000003',
    email: 'entrepreneur@manatown.test',
    passwordEnv: 'SEED_PASSWORD_ENTREPRENEUR',
    displayName: 'Demo Women Entrepreneur',
    role: UserRole.BUSINESS_OWNER,
  },
  {
    id: '00000000-0000-4000-8000-000000000004',
    email: 'admin@manatown.test',
    passwordEnv: 'SEED_PASSWORD_ADMIN',
    displayName: 'Demo Administrator',
    role: UserRole.ADMIN,
  },
] as const;

function requiredEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} must be set.`);
  return value;
}

function createAdminClient() {
  return createClient(
    requiredEnv('SUPABASE_URL'),
    requiredEnv('SUPABASE_SECRET_KEY'),
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

async function provisionDemoAccount(
  admin: ReturnType<typeof createAdminClient>,
  account: (typeof demoAccounts)[number],
) {
  const password = requiredEnv(account.passwordEnv);
  if (password.length < 12) {
    throw new Error(`${account.passwordEnv} must be at least 12 characters.`);
  }

  const { data: listed, error: listError } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  if (listError)
    throw new Error(`Could not list demo accounts: ${listError.message}`);
  const existing = listed.users.find(
    (user) => user.email?.toLowerCase() === account.email,
  );

  const authResult = existing
    ? await admin.auth.admin.updateUserById(existing.id, {
        password,
        email_confirm: true,
        user_metadata: { display_name: account.displayName },
      })
    : await admin.auth.admin.createUser({
        email: account.email,
        password,
        email_confirm: true,
        user_metadata: { display_name: account.displayName },
      });
  if (authResult.error) {
    throw new Error(
      `Could not provision ${account.email}: ${authResult.error.message}`,
    );
  }

  const authUserId = authResult.data.user.id;
  await prisma.user.upsert({
    where: { id: account.id },
    update: {
      authUserId,
      email: account.email,
      displayName: account.displayName,
    },
    create: {
      id: account.id,
      authUserId,
      email: account.email,
      displayName: account.displayName,
    },
  });
  await prisma.userRoleAssignment.deleteMany({
    where: { userId: account.id },
  });
  await prisma.userRoleAssignment.create({
    data: { userId: account.id, role: account.role },
  });
}

async function main() {
  const categories = [
    { nameEnglish: 'Groceries', nameTelugu: 'కిరాణా', slug: 'groceries' },
    { nameEnglish: 'Education', nameTelugu: 'విద్య', slug: 'education' },
    {
      nameEnglish: 'Home Services',
      nameTelugu: 'గృహ సేవలు',
      slug: 'home-services',
    },
    { nameEnglish: 'Tailoring', nameTelugu: 'దర్జీ పని', slug: 'tailoring' },
    {
      nameEnglish: 'Farm & Agriculture Services',
      nameTelugu: 'వ్యవసాయ సేవలు',
      slug: 'farm-agriculture-services',
    },
    {
      nameEnglish: 'Farm Labour & Workforce',
      nameTelugu: 'వ్యవసాయ కార్మికులు',
      slug: 'farm-labour-workforce',
    },
    {
      nameEnglish: 'Farm Goods Transport',
      nameTelugu: 'వ్యవసాయ సరుకు రవాణా',
      slug: 'farm-goods-transport',
    },
  ];

  for (const category of categories) {
    await prisma.businessCategory.upsert({
      where: { slug: category.slug },
      update: {
        nameEnglish: category.nameEnglish,
        nameTelugu: category.nameTelugu,
      },
      create: category,
    });
  }

  if (process.env.SEED_DEMO_DATA !== 'true') return;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Demo users cannot be seeded in production.');
  }

  const admin = createAdminClient();
  for (const account of demoAccounts) {
    await provisionDemoAccount(admin, account);
  }

  const businessId = '00000000-0000-4000-8000-000000000010';
  const entrepreneurId = demoAccounts[2].id;
  const adminId = demoAccounts[3].id;
  const tailoring = await prisma.businessCategory.findUniqueOrThrow({
    where: { slug: 'tailoring' },
    select: { id: true },
  });

  await prisma.business.upsert({
    where: { id: businessId },
    update: { status: 'APPROVED' },
    create: {
      id: businessId,
      name: 'Demo Kadiri Tailoring',
      description:
        'Fictional sample listing for trying the local business directory.',
      address: 'Demo Market Street',
      locality: 'Kadiri',
      status: 'APPROVED',
      approvedAt: new Date(),
      ownerships: { create: { userId: entrepreneurId } },
      categories: {
        create: {
          category: { connect: { slug: 'tailoring' } },
        },
      },
      hours: {
        create: Array.from({ length: 7 }, (_, weekday) => ({
          weekday,
          opensAt: '09:00',
          closesAt: '18:00',
          closed: weekday === 6,
        })),
      },
    },
  });
  await prisma.businessOwnership.upsert({
    where: {
      businessId_userId: { businessId, userId: entrepreneurId },
    },
    update: {},
    create: { businessId, userId: entrepreneurId },
  });
  await prisma.businessCategoryAssignment.upsert({
    where: {
      businessId_categoryId: {
        businessId,
        categoryId: tailoring.id,
      },
    },
    update: {},
    create: { businessId, categoryId: tailoring.id },
  });
  await prisma.entrepreneurClassification.upsert({
    where: { businessId },
    update: { status: 'APPROVED', approvedAt: new Date() },
    create: {
      businessId,
      requesterId: entrepreneurId,
      reviewedBy: adminId,
      status: 'APPROVED',
      approvedAt: new Date(),
    },
  });
}

main()
  .catch((error: unknown) => {
    console.error('Database seed failed.', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
