import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BusinessStatus, Prisma } from '@prisma/client';
import type { Page } from '@mana-town/shared-types';
import { BusinessQueryDto } from './business-query.dto.js';
import { BusinessWriteDto, UpdateBusinessDto } from './business-write.dto.js';
import { AdminBusinessQueryDto } from './admin-business-query.dto.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  BusinessImageStorageService,
  type UploadedBusinessImage,
} from './business-image-storage.service.js';

export function buildBusinessWhere(
  filters: Pick<BusinessQueryDto, 'search' | 'category' | 'locality'>,
): Prisma.BusinessWhereInput {
  const search = filters.search?.trim();
  const category = filters.category?.trim();
  const locality = filters.locality?.trim();

  return {
    status: BusinessStatus.APPROVED,
    ...(locality
      ? { locality: { contains: locality, mode: 'insensitive' } }
      : {}),
    ...(category
      ? {
          categories: {
            some: {
              category: { slug: { equals: category, mode: 'insensitive' } },
            },
          },
        }
      : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
            { address: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {}),
  };
}

const businessSelect = {
  id: true,
  name: true,
  description: true,
  address: true,
  locality: true,
  latitude: true,
  longitude: true,
  phone: true,
  whatsapp: true,
  images: {
    orderBy: { sortOrder: 'asc' as const },
    select: { id: true, objectKey: true, altText: true },
  },
  categories: {
    select: {
      category: {
        select: { id: true, nameEnglish: true, nameTelugu: true, slug: true },
      },
    },
  },
  hours: {
    orderBy: { weekday: 'asc' as const },
    select: {
      weekday: true,
      opensAt: true,
      closesAt: true,
      closed: true,
    },
  },
} satisfies Prisma.BusinessSelect;

const ownedBusinessSelect = {
  ...businessSelect,
  status: true,
  rejectionReason: true,
  updatedAt: true,
  entrepreneur: {
    select: { id: true, status: true, rejectionReason: true },
  },
} satisfies Prisma.BusinessSelect;

const moderatedBusinessSelect = {
  ...ownedBusinessSelect,
  createdAt: true,
  approvedAt: true,
} satisfies Prisma.BusinessSelect;

export type BusinessListItem = {
  id: string;
  name: string;
  description: string;
  address: string;
  locality: string;
  latitude: number | null;
  longitude: number | null;
  phone: string | null;
  whatsapp: string | null;
  images: { id: string; imageUrl: string; altText: string }[];
  categories: {
    id: string;
    nameEnglish: string;
    nameTelugu: string;
    slug: string;
  }[];
  hours: {
    weekday: number;
    opensAt: string | null;
    closesAt: string | null;
    closed: boolean;
  }[];
};

type OwnedBusinessItem = BusinessListItem & {
  status: BusinessStatus;
  rejectionReason: string | null;
  updatedAt: Date;
  entrepreneur: {
    id: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    rejectionReason: string | null;
  } | null;
};

type ModeratedBusinessItem = OwnedBusinessItem & {
  createdAt: Date;
  approvedAt: Date | null;
};

@Injectable()
export class BusinessesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly imageStorage: BusinessImageStorageService,
  ) {}

  async list(filters: BusinessQueryDto): Promise<Page<BusinessListItem>> {
    const where = buildBusinessWhere(filters);
    const skip = (filters.page - 1) * filters.pageSize;
    const total = await this.prisma.business.count({ where });
    const ids =
      filters.latitude !== undefined && filters.longitude !== undefined
        ? await this.nearestIds(filters, skip)
        : undefined;
    const records = await this.prisma.business.findMany({
      where: ids ? { ...where, id: { in: ids } } : where,
      select: businessSelect,
      ...(ids
        ? {}
        : { orderBy: { name: 'asc' as const }, skip, take: filters.pageSize }),
    });
    const byId = new Map(records.map((record) => [record.id, record]));
    const orderedRecords = ids
      ? ids.flatMap((id) => {
          const record = byId.get(id);
          return record ? [record] : [];
        })
      : records;

    return {
      items: await Promise.all(
        orderedRecords.map((record) => this.publicBusiness(record)),
      ),
      page: filters.page,
      pageSize: filters.pageSize,
      total,
    };
  }

  private async nearestIds(
    filters: BusinessQueryDto,
    skip: number,
  ): Promise<string[]> {
    const conditions: Prisma.Sql[] = [Prisma.sql`b.status = 'APPROVED'`];
    const locality = filters.locality?.trim();
    const search = filters.search?.trim();
    const category = filters.category?.trim();
    if (locality) {
      conditions.push(Prisma.sql`b.locality ILIKE ${`%${locality}%`}`);
    }
    if (search) {
      const pattern = `%${search}%`;
      conditions.push(
        Prisma.sql`(b.name ILIKE ${pattern} OR b.description ILIKE ${pattern} OR b.address ILIKE ${pattern})`,
      );
    }
    if (category) {
      conditions.push(Prisma.sql`EXISTS (
        SELECT 1
        FROM public.business_category_assignments bca
        JOIN public.business_categories bc ON bc.id = bca.category_id
        WHERE bca.business_id = b.id AND bc.slug ILIKE ${category}
      )`);
    }
    const rows = await this.prisma.$queryRaw<Array<{ id: string }>>(
      Prisma.sql`
        SELECT b.id
        FROM public.businesses b
        WHERE ${Prisma.join(conditions, ' AND ')}
        ORDER BY
          (b.latitude IS NULL OR b.longitude IS NULL) ASC,
          6371 * acos(GREATEST(-1.0, LEAST(1.0,
            cos(radians(${filters.latitude!})) * cos(radians(b.latitude)) *
            cos(radians(b.longitude) - radians(${filters.longitude!})) +
            sin(radians(${filters.latitude!})) * sin(radians(b.latitude))
          ))) ASC,
          b.name ASC
        LIMIT ${filters.pageSize} OFFSET ${skip}
      `,
    );
    return rows.map(({ id }) => id);
  }

  private async publicBusiness<
    T extends Prisma.BusinessGetPayload<{ select: typeof businessSelect }>,
  >(
    record: T,
  ): Promise<
    Omit<T, 'categories' | 'images'> &
      Pick<BusinessListItem, 'categories' | 'images'>
  > {
    const images = await Promise.all(
      record.images.map(async ({ id, objectKey, altText }) => ({
        id,
        altText,
        imageUrl: await this.imageStorage.readUrl(objectKey),
      })),
    );
    return {
      ...record,
      images,
      categories: record.categories.map(({ category }) => category),
    };
  }

  async getById(id: string): Promise<BusinessListItem> {
    const record = await this.prisma.business.findFirst({
      where: { id, status: BusinessStatus.APPROVED },
      select: businessSelect,
    });
    if (!record) {
      throw new NotFoundException('Business not found.');
    }
    return this.publicBusiness(record);
  }

  async recordView(businessId: string, viewerId: string) {
    const isOwner = await this.prisma.businessOwnership.findUnique({
      where: { businessId_userId: { businessId, userId: viewerId } },
      select: { userId: true },
    });
    if (isOwner) return;
    await this.prisma.businessView.create({ data: { businessId, viewerId } });
  }

  async viewStats(userId: string) {
    const owned = await this.prisma.business.findMany({
      where: { ownerships: { some: { userId } } },
      select: { id: true, name: true, status: true },
      orderBy: { name: 'asc' },
    });
    const ids = owned.map(({ id }) => id);
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const [views, recent, viewers] = await Promise.all([
      this.prisma.businessView.groupBy({
        by: ['businessId'],
        where: { businessId: { in: ids } },
        _count: { _all: true },
      }),
      this.prisma.businessView.groupBy({
        by: ['businessId'],
        where: { businessId: { in: ids }, createdAt: { gte: since } },
        _count: { _all: true },
      }),
      this.prisma.businessView.groupBy({
        by: ['businessId', 'viewerId'],
        where: { businessId: { in: ids } },
      }),
    ]);
    const total = new Map(
      views.map((row) => [row.businessId, row._count._all]),
    );
    const week = new Map(
      recent.map((row) => [row.businessId, row._count._all]),
    );
    const unique = new Map<string, number>();
    for (const row of viewers) {
      unique.set(row.businessId, (unique.get(row.businessId) ?? 0) + 1);
    }
    return owned.map((business) => ({
      ...business,
      totalViews: total.get(business.id) ?? 0,
      uniqueViewers: unique.get(business.id) ?? 0,
      viewsLast7Days: week.get(business.id) ?? 0,
    }));
  }

  async listCategories() {
    return this.prisma.businessCategory.findMany({
      orderBy: { nameEnglish: 'asc' },
      select: { id: true, nameEnglish: true, nameTelugu: true, slug: true },
    });
  }

  async listMine(userId: string): Promise<OwnedBusinessItem[]> {
    const records = await this.prisma.business.findMany({
      where: { ownerships: { some: { userId } } },
      select: ownedBusinessSelect,
      orderBy: { updatedAt: 'desc' },
    });
    return Promise.all(records.map((record) => this.publicBusiness(record)));
  }

  async createOwned(
    userId: string,
    input: BusinessWriteDto,
  ): Promise<OwnedBusinessItem> {
    const category = await this.prisma.businessCategory.findUnique({
      where: { id: input.categoryId },
      select: { id: true },
    });
    if (!category) {
      throw new NotFoundException('Business category not found.');
    }

    const record = await this.prisma.business.create({
      data: {
        createdByAuthUserId: this.prisma.currentAuthUserId(),
        name: input.name.trim(),
        description: input.description.trim(),
        address: input.address.trim(),
        locality: input.locality.trim(),
        latitude: input.coordinates?.latitude ?? null,
        longitude: input.coordinates?.longitude ?? null,
        phone: input.phone?.trim() || null,
        whatsapp: input.whatsapp?.trim() || null,
        status: BusinessStatus.DRAFT,
        ownerships: { create: { userId } },
        categories: { create: { categoryId: category.id } },
        hours: {
          create: (input.hours ?? []).map((hour) => ({
            weekday: hour.weekday,
            closed: hour.closed,
            opensAt: hour.closed ? null : (hour.opensAt ?? null),
            closesAt: hour.closed ? null : (hour.closesAt ?? null),
          })),
        },
      },
      select: ownedBusinessSelect,
    });
    return this.publicBusiness(record);
  }

  async updateOwned(
    userId: string,
    id: string,
    input: UpdateBusinessDto,
  ): Promise<OwnedBusinessItem> {
    const existing = await this.prisma.business.findFirst({
      where: { id, ownerships: { some: { userId } } },
      select: { status: true },
    });
    if (!existing) {
      throw new NotFoundException('Business not found.');
    }
    if (existing.status === BusinessStatus.SUSPENDED) {
      throw new ForbiddenException('Suspended listings cannot be edited.');
    }

    if (input.categoryId) {
      const category = await this.prisma.businessCategory.findUnique({
        where: { id: input.categoryId },
        select: { id: true },
      });
      if (!category) {
        throw new NotFoundException('Business category not found.');
      }
    }

    return this.prisma.$transaction(async (transaction) => {
      const record = await transaction.business.update({
        where: { id },
        data: {
          ...(input.name !== undefined ? { name: input.name.trim() } : {}),
          ...(input.description !== undefined
            ? { description: input.description.trim() }
            : {}),
          ...(input.address !== undefined
            ? { address: input.address.trim() }
            : {}),
          ...(input.locality !== undefined
            ? { locality: input.locality.trim() }
            : {}),
          ...(input.coordinates !== undefined
            ? {
                latitude: input.coordinates.latitude,
                longitude: input.coordinates.longitude,
              }
            : {}),
          ...(input.phone !== undefined
            ? { phone: input.phone.trim() || null }
            : {}),
          ...(input.whatsapp !== undefined
            ? { whatsapp: input.whatsapp.trim() || null }
            : {}),
          ...(input.categoryId
            ? {
                categories: {
                  deleteMany: {},
                  create: { categoryId: input.categoryId },
                },
              }
            : {}),
          ...(input.hours
            ? {
                hours: {
                  deleteMany: {},
                  create: input.hours.map((hour) => ({
                    weekday: hour.weekday,
                    closed: hour.closed,
                    opensAt: hour.closed ? null : (hour.opensAt ?? null),
                    closesAt: hour.closed ? null : (hour.closesAt ?? null),
                  })),
                },
              }
            : {}),
          status: BusinessStatus.DRAFT,
          approvedAt: null,
          rejectionReason: null,
        },
        select: ownedBusinessSelect,
      });
      await transaction.businessModerationHistory.create({
        data: {
          businessId: id,
          actorId: userId,
          status: BusinessStatus.DRAFT,
          reason: 'Owner updated listing; review required.',
        },
      });
      return this.publicBusiness(record);
    });
  }

  async addBusinessImage(
    userId: string,
    businessId: string,
    file: UploadedBusinessImage,
    altText: string,
  ) {
    const business = await this.prisma.business.findFirst({
      where: {
        id: businessId,
        ownerships: { some: { userId } },
      },
      select: { id: true, status: true },
    });
    if (!business) {
      throw new NotFoundException('Business not found.');
    }
    if (
      business.status !== BusinessStatus.DRAFT &&
      business.status !== BusinessStatus.REJECTED
    ) {
      throw new ConflictException(
        'Save the listing as a draft before adding photos.',
      );
    }
    const imageCount = await this.prisma.businessImage.count({
      where: { businessId },
    });
    if (imageCount >= 5) {
      throw new ConflictException('A business can have up to 5 photos.');
    }

    const objectKey = await this.imageStorage.upload(businessId, file);
    try {
      const image = await this.prisma.businessImage.create({
        data: {
          businessId,
          objectKey,
          altText: altText.trim() || 'Business photo',
          sortOrder: imageCount,
        },
        select: { id: true, objectKey: true, altText: true },
      });
      return {
        id: image.id,
        altText: image.altText,
        imageUrl: await this.imageStorage.readUrl(image.objectKey),
      };
    } catch (error) {
      await this.imageStorage.delete(objectKey);
      throw error;
    }
  }

  async submitOwned(userId: string, id: string): Promise<OwnedBusinessItem> {
    const existing = await this.prisma.business.findFirst({
      where: { id, ownerships: { some: { userId } } },
      select: { status: true },
    });
    if (!existing) {
      throw new NotFoundException('Business not found.');
    }
    if (
      existing.status !== BusinessStatus.DRAFT &&
      existing.status !== BusinessStatus.REJECTED
    ) {
      throw new ConflictException(
        'Only draft or rejected listings can be submitted.',
      );
    }

    return this.prisma.$transaction(async (transaction) => {
      const record = await transaction.business.update({
        where: { id },
        data: {
          status: BusinessStatus.PENDING,
          rejectionReason: null,
        },
        select: ownedBusinessSelect,
      });
      await transaction.businessModerationHistory.create({
        data: {
          businessId: id,
          actorId: userId,
          status: BusinessStatus.PENDING,
        },
      });
      return this.publicBusiness(record);
    });
  }

  async listForAdmin(
    query: AdminBusinessQueryDto,
  ): Promise<Page<ModeratedBusinessItem>> {
    const where: Prisma.BusinessWhereInput = query.status
      ? { status: query.status }
      : {};
    const [records, total] = await this.prisma.$transaction([
      this.prisma.business.findMany({
        where,
        select: moderatedBusinessSelect,
        orderBy: { updatedAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.business.count({ where }),
    ]);
    return {
      items: await Promise.all(
        records.map((record) => this.publicBusiness(record)),
      ),
      page: query.page,
      pageSize: query.pageSize,
      total,
    };
  }

  async approveBusiness(id: string, actorId: string) {
    return this.reviewBusiness(id, actorId, BusinessStatus.APPROVED);
  }

  async rejectBusiness(id: string, actorId: string, reason: string) {
    return this.reviewBusiness(
      id,
      actorId,
      BusinessStatus.REJECTED,
      reason.trim(),
    );
  }

  private async reviewBusiness(
    id: string,
    actorId: string,
    status: Extract<BusinessStatus, 'APPROVED' | 'REJECTED'>,
    reason?: string,
  ): Promise<OwnedBusinessItem> {
    return this.prisma.$transaction(async (transaction) => {
      const changed = await transaction.business.updateMany({
        where: { id, status: BusinessStatus.PENDING },
        data: {
          status,
          approvedAt: status === BusinessStatus.APPROVED ? new Date() : null,
          rejectionReason:
            status === BusinessStatus.REJECTED ? (reason ?? '') : null,
        },
      });
      if (changed.count !== 1) {
        throw new ConflictException(
          'Business listing is not pending or no longer exists.',
        );
      }
      const record = await transaction.business.findUniqueOrThrow({
        where: { id },
        select: ownedBusinessSelect,
      });
      await transaction.businessModerationHistory.create({
        data: { businessId: id, actorId, status, reason: reason ?? null },
      });
      await transaction.auditLog.create({
        data: {
          actorId,
          action:
            status === BusinessStatus.APPROVED
              ? 'BUSINESS_APPROVED'
              : 'BUSINESS_REJECTED',
          entityType: 'BUSINESS',
          entityId: id,
        },
      });
      return this.publicBusiness(record);
    });
  }
}
