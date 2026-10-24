import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { IssueStatus, Prisma } from '@prisma/client';
import type { Page } from '@mana-town/shared-types';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import {
  AdminIssueQueryDto,
  CreateIssueDto,
  UpdateIssueStatusDto,
} from './issue.dto.js';
import { PrismaService } from '../prisma/prisma.service.js';

const residentIssueSelect = {
  id: true,
  reference: true,
  title: true,
  description: true,
  category: true,
  locality: true,
  status: true,
  resolution: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.IssueReportSelect;

const adminIssueSelect = {
  ...residentIssueSelect,
  reporter: { select: { id: true, displayName: true } },
  history: {
    orderBy: { createdAt: 'asc' as const },
    select: {
      status: true,
      details: true,
      createdAt: true,
      actor: { select: { displayName: true } },
    },
  },
  notes: {
    orderBy: { createdAt: 'asc' as const },
    select: {
      id: true,
      note: true,
      createdAt: true,
      author: { select: { displayName: true } },
    },
  },
} satisfies Prisma.IssueReportSelect;

export function canTransitionIssueStatus(
  current: IssueStatus,
  next: IssueStatus,
) {
  const allowedTransitions: Record<IssueStatus, IssueStatus[]> = {
    [IssueStatus.SUBMITTED]: [IssueStatus.UNDER_REVIEW, IssueStatus.REJECTED],
    [IssueStatus.UNDER_REVIEW]: [
      IssueStatus.IN_PROGRESS,
      IssueStatus.REJECTED,
      IssueStatus.CLOSED,
    ],
    [IssueStatus.IN_PROGRESS]: [IssueStatus.RESOLVED, IssueStatus.REJECTED],
    [IssueStatus.RESOLVED]: [IssueStatus.CLOSED],
    [IssueStatus.REJECTED]: [IssueStatus.CLOSED],
    [IssueStatus.CLOSED]: [],
  };
  return allowedTransitions[current].includes(next);
}

@Injectable()
export class IssuesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(reporterId: string, input: CreateIssueDto) {
    return this.prisma.issueReport.create({
      data: {
        reporterId,
        title: input.title.trim(),
        description: input.description.trim(),
        category: input.category.trim(),
        locality: input.locality.trim(),
        history: {
          create: { actorId: reporterId, status: IssueStatus.SUBMITTED },
        },
      },
      select: residentIssueSelect,
    });
  }

  async listMine(userId: string) {
    return this.prisma.issueReport.findMany({
      where: { reporterId: userId },
      select: residentIssueSelect,
      orderBy: { createdAt: 'desc' },
    });
  }

  async getForUser(id: string, user: AuthenticatedUser) {
    const record = await this.prisma.issueReport.findFirst({
      where: {
        id,
        ...(user.roles.includes('ADMIN') ? {} : { reporterId: user.id }),
      },
      select: user.roles.includes('ADMIN')
        ? adminIssueSelect
        : residentIssueSelect,
    });
    if (!record) throw new NotFoundException('Issue report not found.');
    return record;
  }

  async listForAdmin(
    query: AdminIssueQueryDto,
  ): Promise<
    Page<Prisma.IssueReportGetPayload<{ select: typeof adminIssueSelect }>>
  > {
    const where: Prisma.IssueReportWhereInput = query.status
      ? { status: query.status }
      : {};
    const [items, total] = await this.prisma.$transaction([
      this.prisma.issueReport.findMany({
        where,
        select: adminIssueSelect,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.issueReport.count({ where }),
    ]);
    return { items, total, page: query.page, pageSize: query.pageSize };
  }

  async updateStatus(id: string, actorId: string, input: UpdateIssueStatusDto) {
    return this.prisma.$transaction(async (transaction) => {
      const current = await transaction.issueReport.findUnique({
        where: { id },
        select: { status: true },
      });
      if (!current) throw new NotFoundException('Issue report not found.');
      if (!canTransitionIssueStatus(current.status, input.status)) {
        throw new ConflictException(
          `Issue status cannot change from ${current.status} to ${input.status}.`,
        );
      }
      if (input.status === IssueStatus.RESOLVED && !input.resolution?.trim()) {
        throw new ConflictException(
          'A resolution detail is required to resolve a report.',
        );
      }

      const changed = await transaction.issueReport.updateMany({
        where: { id, status: current.status },
        data: {
          status: input.status,
          ...(input.status === IssueStatus.RESOLVED
            ? { resolution: input.resolution?.trim() ?? null }
            : {}),
        },
      });
      if (changed.count !== 1) {
        throw new ConflictException('Issue status changed; reload and retry.');
      }

      await transaction.issueStatusHistory.create({
        data: {
          issueId: id,
          actorId,
          status: input.status,
          details: input.resolution?.trim() ?? null,
        },
      });
      if (input.internalNote?.trim()) {
        await transaction.issueInternalNote.create({
          data: {
            issueId: id,
            authorId: actorId,
            note: input.internalNote.trim(),
          },
        });
      }
      await transaction.auditLog.create({
        data: {
          actorId,
          action: `ISSUE_${input.status}`,
          entityType: 'ISSUE',
          entityId: id,
        },
      });

      return transaction.issueReport.findUniqueOrThrow({
        where: { id },
        select: adminIssueSelect,
      });
    });
  }
}
