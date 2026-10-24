import { PrismaClient, UserRole } from '@prisma/client';
import { hashPassword } from '../src/auth/password.js';

const prisma = new PrismaClient();

async function main() {
  const categories = [
    {
      nameEnglish: 'Groceries',
      nameTelugu: 'కిరాణా',
      slug: 'groceries',
    },
    { nameEnglish: 'Education', nameTelugu: 'విద్య', slug: 'education' },
    {
      nameEnglish: 'Home Services',
      nameTelugu: 'గృహ సేవలు',
      slug: 'home-services',
    },
    { nameEnglish: 'Tailoring', nameTelugu: 'దర్జీ పని', slug: 'tailoring' },
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

  if (process.env.SEED_DEMO_DATA === 'true') {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Demo users cannot be seeded in production.');
    }
    const demoUsers = [
      {
        id: '00000000-0000-4000-8000-000000000001',
        username: 'resident',
        passwordEnv: 'SEED_PASSWORD_RESIDENT',
        displayName: 'Demo Resident',
        role: UserRole.RESIDENT,
      },
      {
        id: '00000000-0000-4000-8000-000000000002',
        username: 'owner',
        passwordEnv: 'SEED_PASSWORD_OWNER',
        displayName: 'Demo Business Owner',
        role: UserRole.BUSINESS_OWNER,
      },
      {
        id: '00000000-0000-4000-8000-000000000003',
        username: 'entrepreneur',
        passwordEnv: 'SEED_PASSWORD_ENTREPRENEUR',
        displayName: 'Demo Women Entrepreneur',
        role: UserRole.WOMEN_ENTREPRENEUR,
      },
      {
        id: '00000000-0000-4000-8000-000000000004',
        username: 'admin',
        passwordEnv: 'SEED_PASSWORD_ADMIN',
        displayName: 'Demo Administrator',
        role: UserRole.ADMIN,
      },
    ];
    for (const demo of demoUsers) {
      const password = process.env[demo.passwordEnv];
      if (!password || password.length < 12) {
        throw new Error(`${demo.passwordEnv} must be set (12+ characters).`);
      }
      const passwordHash = await hashPassword(password);
      await prisma.user.upsert({
        where: { id: demo.id },
        update: {
          displayName: demo.displayName,
          username: demo.username,
          passwordHash,
        },
        create: {
          id: demo.id,
          displayName: demo.displayName,
          username: demo.username,
          passwordHash,
        },
      });
      await prisma.userRoleAssignment.upsert({
        where: { userId_role: { userId: demo.id, role: demo.role } },
        update: {},
        create: { userId: demo.id, role: demo.role },
      });
    }

    const businessId = '00000000-0000-4000-8000-000000000010';
    const entrepreneurId = '00000000-0000-4000-8000-000000000003';
    const adminId = '00000000-0000-4000-8000-000000000004';
    await prisma.userRoleAssignment.upsert({
      where: {
        userId_role: {
          userId: entrepreneurId,
          role: UserRole.BUSINESS_OWNER,
        },
      },
      update: {},
      create: {
        userId: entrepreneurId,
        role: UserRole.BUSINESS_OWNER,
      },
    });
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
}

main()
  .catch((error: unknown) => {
    console.error('Database seed failed.', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
