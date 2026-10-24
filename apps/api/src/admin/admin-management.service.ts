import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AdvertisementEventKind,
  AdvertisementStatus,
  BusinessStatus,
  Prisma,
  UserRole,
} from '@prisma/client';
import type { Page } from '@mana-town/shared-types';
import {
  AdminUserQueryDto,
  AdvertisementCampaignDto,
  BusinessCategoryDto,
  UpdateAdvertisementCampaignDto,
  UpdateBusinessCategoryDto,
  UpdateUserRolesDto,
} from './admin-management.dto.js';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class AdminManagementService {
  constructor(private readonly prisma: PrismaService) {}

  async listUsers(query: AdminUserQueryDto) {
    const [items, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        select: {
          id: true,
          email: true,
          displayName: true,
          createdAt: true,
          roles: { select: { role: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.user.count(),
    ]);
    return { items, total, page: query.page, pageSize: query.pageSize };
  }

  async updateUserRoles(
    actorId: string,
    targetId: string,
    input: UpdateUserRolesDto,
  ) {
    if (actorId === targetId) {
      throw new ConflictException(
        'Administrators cannot change their own roles.',
      );
    }
    try {
      return await this.prisma.$transaction(async (transaction) => {
        await transaction.$queryRaw`SELECT pg_advisory_xact_lock(1928374, 1)`;
        const target = await transaction.user.findUnique({
          where: { id: targetId },
          select: { id: true, roles: { select: { role: true } } },
        });
        if (!target) throw new NotFoundException('User not found.');
        const removesAdministrator =
          target.roles.some(({ role }) => role === UserRole.ADMIN) &&
          !input.roles.includes(UserRole.ADMIN);
        if (removesAdministrator) {
          const administratorCount = await transaction.userRoleAssignment.count(
            {
              where: { role: UserRole.ADMIN },
            },
          );
          if (administratorCount <= 1) {
            throw new ConflictException(
              'The last administrator cannot be removed.',
            );
          }
        }
        await transaction.userRoleAssignment.deleteMany({
          where: { userId: targetId },
        });
        if (input.roles.length > 0) {
          await transaction.userRoleAssignment.createMany({
            data: input.roles.map((role) => ({ userId: targetId, role })),
          });
        }
        await transaction.auditLog.create({
          data: {
            actorId,
            action: 'USER_ROLES_UPDATED',
            entityType: 'USER',
            entityId: targetId,
          },
        });
        return transaction.user.findUniqueOrThrow({
          where: { id: targetId },
          select: {
            id: true,
            email: true,
            displayName: true,
            roles: { select: { role: true } },
          },
        });
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2034'
      ) {
        throw new ConflictException(
          'Roles changed concurrently. Reload and retry.',
        );
      }
      throw error;
    }
  }

  listCategories() {
    return this.prisma.businessCategory.findMany({
      orderBy: { nameEnglish: 'asc' },
      select: { id: true, nameEnglish: true, nameTelugu: true, slug: true },
    });
  }

  async createCategory(input: BusinessCategoryDto, actorId: string) {
    const exists = await this.prisma.businessCategory.findUnique({
      where: { slug: input.slug },
      select: { id: true },
    });
    if (exists) throw new ConflictException('Category slug already exists.');
    return this.withUniqueConflict('Category slug already exists.', () =>
      this.prisma.$transaction(async (transaction) => {
        const category = await transaction.businessCategory.create({
          data: {
            nameEnglish: input.nameEnglish.trim(),
            nameTelugu: input.nameTelugu.trim(),
            slug: input.slug,
          },
        });
        await this.audit(
          actorId,
          'BUSINESS_CATEGORY_CREATED',
          'BUSINESS_CATEGORY',
          category.id,
          transaction,
        );
        return category;
      }),
    );
  }

  async updateCategory(
    id: string,
    input: UpdateBusinessCategoryDto,
    actorId: string,
  ) {
    const category = await this.prisma.businessCategory.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!category) throw new NotFoundException('Category not found.');
    if (input.slug) {
      const existingSlug = await this.prisma.businessCategory.findUnique({
        where: { slug: input.slug },
        select: { id: true },
      });
      if (existingSlug && existingSlug.id !== id) {
        throw new ConflictException('Category slug already exists.');
      }
    }
    return this.withUniqueConflict('Category slug already exists.', () =>
      this.prisma.$transaction(async (transaction) => {
        const updated = await transaction.businessCategory.update({
          where: { id },
          data: {
            ...(input.nameEnglish !== undefined
              ? { nameEnglish: input.nameEnglish.trim() }
              : {}),
            ...(input.nameTelugu !== undefined
              ? { nameTelugu: input.nameTelugu.trim() }
              : {}),
            ...(input.slug !== undefined ? { slug: input.slug } : {}),
          },
        });
        await this.audit(
          actorId,
          'BUSINESS_CATEGORY_UPDATED',
          'BUSINESS_CATEGORY',
          id,
          transaction,
        );
        return updated;
      }),
    );
  }

  async listCampaigns() {
    await this.expireCampaigns();
    const campaigns = await this.prisma.advertisementCampaign.findMany({
      orderBy: { createdAt: 'desc' },
      include: { assets: { select: { id: true } } },
    });
    const counts = await this.prisma.$transaction(
      campaigns.flatMap((campaign) => [
        this.prisma.advertisementEvent.count({
          where: {
            campaignId: campaign.id,
            kind: AdvertisementEventKind.IMPRESSION,
          },
        }),
        this.prisma.advertisementEvent.count({
          where: {
            campaignId: campaign.id,
            kind: AdvertisementEventKind.CLICK,
          },
        }),
      ]),
    );
    return campaigns.map((campaign, index) => {
      const impressions = counts[index * 2];
      const clicks = counts[index * 2 + 1];
      if (impressions === undefined || clicks === undefined) {
        throw new Error('Advertisement event counts are incomplete.');
      }
      return { ...campaign, impressions, clicks };
    });
  }

  async createCampaign(input: AdvertisementCampaignDto, actorId: string) {
    const startsAt = new Date(input.startsAt);
    const endsAt = new Date(input.endsAt);
    if (endsAt <= startsAt) {
      throw new ConflictException(
        'Campaign end date must be after its start date.',
      );
    }
    if (input.businessId) {
      const business = await this.prisma.business.findUnique({
        where: { id: input.businessId },
        select: { id: true },
      });
      if (!business)
        throw new NotFoundException('Advertiser business not found.');
    }
    return this.prisma.$transaction(async (transaction) => {
      const campaign = await transaction.advertisementCampaign.create({
        data: {
          name: input.name.trim(),
          businessId: input.businessId ?? null,
          placement: input.placement,
          startsAt,
          endsAt,
          status: input.status,
        },
      });
      await this.audit(
        actorId,
        'ADVERTISEMENT_CREATED',
        'ADVERTISEMENT',
        campaign.id,
        transaction,
      );
      return campaign;
    });
  }

  async updateCampaign(
    id: string,
    input: UpdateAdvertisementCampaignDto,
    actorId: string,
  ) {
    const existing = await this.prisma.advertisementCampaign.findUnique({
      where: { id },
      select: { startsAt: true, endsAt: true },
    });
    if (!existing)
      throw new NotFoundException('Advertisement campaign not found.');
    const startsAt = input.startsAt
      ? new Date(input.startsAt)
      : existing.startsAt;
    const endsAt = input.endsAt ? new Date(input.endsAt) : existing.endsAt;
    if (endsAt <= startsAt) {
      throw new ConflictException(
        'Campaign end date must be after its start date.',
      );
    }
    if (input.businessId) {
      const business = await this.prisma.business.findUnique({
        where: { id: input.businessId },
        select: { id: true },
      });
      if (!business)
        throw new NotFoundException('Advertiser business not found.');
    }
    return this.prisma.$transaction(async (transaction) => {
      const campaign = await transaction.advertisementCampaign.update({
        where: { id },
        data: {
          ...(input.name !== undefined ? { name: input.name.trim() } : {}),
          ...(input.businessId !== undefined
            ? { businessId: input.businessId }
            : {}),
          ...(input.placement !== undefined
            ? { placement: input.placement }
            : {}),
          ...(input.startsAt ? { startsAt } : {}),
          ...(input.endsAt ? { endsAt } : {}),
          ...(input.status !== undefined ? { status: input.status } : {}),
        },
      });
      await this.audit(
        actorId,
        'ADVERTISEMENT_UPDATED',
        'ADVERTISEMENT',
        id,
        transaction,
      );
      return campaign;
    });
  }

  async listPublicAdvertisements(placement?: string) {
    const now = new Date();
    return this.prisma.advertisementCampaign.findMany({
      where: {
        status: AdvertisementStatus.ACTIVE,
        startsAt: { lte: now },
        endsAt: { gte: now },
        ...(placement ? { placement } : {}),
        OR: [
          { businessId: null },
          { business: { is: { status: BusinessStatus.APPROVED } } },
        ],
      },
      select: {
        id: true,
        name: true,
        placement: true,
        business: { select: { id: true, name: true } },
        assets: { select: { id: true } },
      },
    });
  }

  async trackAdvertisement(id: string, kind: AdvertisementEventKind) {
    const now = new Date();
    const eligible = await this.prisma.advertisementCampaign.findFirst({
      where: {
        id,
        status: AdvertisementStatus.ACTIVE,
        startsAt: { lte: now },
        endsAt: { gte: now },
        OR: [
          { businessId: null },
          { business: { is: { status: BusinessStatus.APPROVED } } },
        ],
      },
      select: { id: true },
    });
    if (!eligible) throw new NotFoundException('Advertisement is not active.');
    return this.prisma.advertisementEvent.create({
      data: { campaignId: id, kind },
      select: { id: true },
    });
  }

  private async expireCampaigns() {
    await this.prisma.advertisementCampaign.updateMany({
      where: {
        status: {
          in: [AdvertisementStatus.ACTIVE, AdvertisementStatus.PAUSED],
        },
        endsAt: { lt: new Date() },
      },
      data: { status: AdvertisementStatus.EXPIRED },
    });
  }

  private async audit(
    actorId: string,
    action: string,
    entityType: string,
    entityId: string,
    transaction: Prisma.TransactionClient = this.prisma,
  ) {
    await transaction.auditLog.create({
      data: { actorId, action, entityType, entityId },
    });
  }

  private async withUniqueConflict<T>(
    message: string,
    operation: () => Promise<T>,
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(message);
      }
      throw error;
    }
  }
}
