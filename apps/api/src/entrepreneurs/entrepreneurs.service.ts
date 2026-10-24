import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  BusinessStatus,
  EntrepreneurClassificationStatus,
  Prisma,
} from '@prisma/client';
import type { Page } from '@mana-town/shared-types';
import {
  AdminEntrepreneurQueryDto,
  EntrepreneurQueryDto,
} from './entrepreneur.dto.js';
import { PrismaService } from '../prisma/prisma.service.js';

const entrepreneurBusinessSelect = {
  id: true,
  name: true,
  description: true,
  address: true,
  locality: true,
  phone: true,
  whatsapp: true,
  categories: {
    select: {
      category: {
        select: { id: true, nameEnglish: true, nameTelugu: true, slug: true },
      },
    },
  },
  hours: {
    orderBy: { weekday: 'asc' as const },
    select: { weekday: true, opensAt: true, closesAt: true, closed: true },
  },
} satisfies Prisma.BusinessSelect;

export function buildEntrepreneurWhere(
  query: Pick<EntrepreneurQueryDto, 'search' | 'category' | 'locality'>,
): Prisma.BusinessWhereInput {
  const search = query.search?.trim();
  return {
    status: BusinessStatus.APPROVED,
    entrepreneur: {
      is: { status: EntrepreneurClassificationStatus.APPROVED },
    },
    ...(query.locality?.trim()
      ? { locality: { contains: query.locality.trim(), mode: 'insensitive' } }
      : {}),
    ...(query.category?.trim()
      ? {
          categories: {
            some: {
              category: {
                slug: {
                  equals: query.category.trim(),
                  mode: 'insensitive',
                },
              },
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

function mapBusiness(record: {
  id: string;
  name: string;
  description: string;
  address: string;
  locality: string;
  phone: string | null;
  whatsapp: string | null;
  categories: {
    category: {
      id: string;
      nameEnglish: string;
      nameTelugu: string;
      slug: string;
    };
  }[];
  hours: {
    weekday: number;
    opensAt: string | null;
    closesAt: string | null;
    closed: boolean;
  }[];
}) {
  return {
    ...record,
    categories: record.categories.map(({ category }) => category),
  };
}

@Injectable()
export class EntrepreneursService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: EntrepreneurQueryDto) {
    const where = buildEntrepreneurWhere(query);
    const [records, total] = await this.prisma.$transaction([
      this.prisma.business.findMany({
        where,
        select: entrepreneurBusinessSelect,
        orderBy: { name: 'asc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.business.count({ where }),
    ]);
    return {
      items: records.map(mapBusiness),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  async getById(id: string) {
    const record = await this.prisma.business.findFirst({
      where: { id, ...buildEntrepreneurWhere({}) },
      select: entrepreneurBusinessSelect,
    });
    if (!record) throw new NotFoundException('Entrepreneur profile not found.');
    return mapBusiness(record);
  }

  async requestClassification(businessId: string, requesterId: string) {
    return this.prisma.$transaction(async (transaction) => {
      const business = await transaction.business.findFirst({
        where: {
          id: businessId,
          ownerships: { some: { userId: requesterId } },
        },
        select: { id: true },
      });
      if (!business) throw new NotFoundException('Business listing not found.');

      const classification =
        await transaction.entrepreneurClassification.upsert({
          where: { businessId },
          update: {
            requesterId,
            status: EntrepreneurClassificationStatus.PENDING,
            rejectionReason: null,
            approvedAt: null,
            reviewedBy: null,
          },
          create: {
            businessId,
            requesterId,
            status: EntrepreneurClassificationStatus.PENDING,
          },
          select: {
            id: true,
            status: true,
            rejectionReason: true,
            createdAt: true,
          },
        });
      await transaction.auditLog.create({
        data: {
          actorId: requesterId,
          action: 'ENTREPRENEUR_CLASSIFICATION_REQUESTED',
          entityType: 'BUSINESS',
          entityId: businessId,
        },
      });
      return classification;
    });
  }

  async listForAdmin(query: AdminEntrepreneurQueryDto) {
    const where: Prisma.EntrepreneurClassificationWhereInput = query.status
      ? { status: query.status }
      : {};
    const [items, total] = await this.prisma.$transaction([
      this.prisma.entrepreneurClassification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        select: {
          id: true,
          status: true,
          rejectionReason: true,
          createdAt: true,
          business: {
            select: {
              id: true,
              name: true,
              locality: true,
              status: true,
              ownerships: {
                select: { user: { select: { id: true, displayName: true } } },
              },
            },
          },
          requester: { select: { id: true, displayName: true } },
        },
      }),
      this.prisma.entrepreneurClassification.count({ where }),
    ]);
    return { items, total, page: query.page, pageSize: query.pageSize };
  }

  async approve(id: string, reviewerId: string) {
    return this.review(
      id,
      reviewerId,
      EntrepreneurClassificationStatus.APPROVED,
    );
  }

  async reject(id: string, reviewerId: string, reason: string) {
    return this.review(
      id,
      reviewerId,
      EntrepreneurClassificationStatus.REJECTED,
      reason.trim(),
    );
  }

  private async review(
    id: string,
    reviewerId: string,
    status: Extract<EntrepreneurClassificationStatus, 'APPROVED' | 'REJECTED'>,
    reason?: string,
  ) {
    return this.prisma.$transaction(async (transaction) => {
      const changed = await transaction.entrepreneurClassification.updateMany({
        where: { id, status: EntrepreneurClassificationStatus.PENDING },
        data: {
          status,
          reviewedBy: reviewerId,
          approvedAt:
            status === EntrepreneurClassificationStatus.APPROVED
              ? new Date()
              : null,
          rejectionReason:
            status === EntrepreneurClassificationStatus.REJECTED
              ? (reason ?? '')
              : null,
        },
      });
      if (changed.count !== 1) {
        throw new ConflictException(
          'Classification request is not pending or no longer exists.',
        );
      }
      const record =
        await transaction.entrepreneurClassification.findUniqueOrThrow({
          where: { id },
          select: { id: true, businessId: true, status: true },
        });
      await transaction.auditLog.create({
        data: {
          actorId: reviewerId,
          action: `ENTREPRENEUR_CLASSIFICATION_${status}`,
          entityType: 'ENTREPRENEUR_CLASSIFICATION',
          entityId: id,
        },
      });
      return record;
    });
  }
}
