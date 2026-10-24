import { Inject, Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';

export type AccessEntry = {
  userId?: string | null | undefined;
  username?: string | null | undefined;
  event: 'LOGIN_SUCCESS' | 'LOGIN_FAILED' | 'REQUEST';
  method?: string | null | undefined;
  path?: string | null | undefined;
  statusCode?: number | null | undefined;
  ipAddress?: string | null | undefined;
  userAgent?: string | null | undefined;
};

const clip = (value: string | null | undefined, max: number) =>
  value == null ? undefined : value.slice(0, max);

@Injectable()
export class AccessLogService {
  private readonly logger = new Logger(AccessLogService.name);

  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  // Logging must never break the request that triggered it.
  record(entry: AccessEntry): void {
    void this.prisma.accessLog
      .create({
        data: {
          userId: entry.userId ?? null,
          username: clip(entry.username, 50) ?? null,
          event: entry.event,
          method: clip(entry.method, 10) ?? null,
          path: clip(entry.path, 300) ?? null,
          statusCode: entry.statusCode ?? null,
          ipAddress: clip(entry.ipAddress, 64) ?? null,
          userAgent: clip(entry.userAgent, 300) ?? null,
        },
      })
      .catch((error: unknown) =>
        this.logger.warn(`Access log write failed: ${String(error)}`),
      );
  }

  async list(options: {
    page: number;
    pageSize: number;
    userId?: string | null | undefined;
    event?: string;
  }) {
    const where: Prisma.AccessLogWhereInput = {
      ...(options.userId ? { userId: options.userId } : {}),
      ...(options.event ? { event: options.event } : {}),
    };
    const [total, items] = await this.prisma.$transaction([
      this.prisma.accessLog.count({ where }),
      this.prisma.accessLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (options.page - 1) * options.pageSize,
        take: options.pageSize,
        select: {
          id: true,
          userId: true,
          username: true,
          event: true,
          method: true,
          path: true,
          statusCode: true,
          ipAddress: true,
          userAgent: true,
          createdAt: true,
          user: { select: { displayName: true } },
        },
      }),
    ]);
    return { items, total, page: options.page, pageSize: options.pageSize };
  }

  async summary() {
    const [users, logins, requests, failures] = await Promise.all([
      this.prisma.user.findMany({
        select: {
          id: true,
          username: true,
          displayName: true,
          roles: { select: { role: true } },
        },
        orderBy: { displayName: 'asc' },
      }),
      this.prisma.accessLog.groupBy({
        by: ['userId'],
        where: { event: 'LOGIN_SUCCESS', userId: { not: null } },
        _count: { id: true },
        _max: { createdAt: true },
        orderBy: { userId: 'asc' },
      }),
      this.prisma.accessLog.groupBy({
        by: ['userId'],
        where: { event: 'REQUEST', userId: { not: null } },
        _count: { id: true },
        orderBy: { userId: 'asc' },
      }),
      this.prisma.accessLog.count({ where: { event: 'LOGIN_FAILED' } }),
    ]);
    const loginByUser = new Map(logins.map((row) => [row.userId, row]));
    const requestsByUser = new Map(requests.map((row) => [row.userId, row]));
    return {
      failedLogins: failures,
      users: users.map((user) => ({
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        roles: user.roles.map(({ role }) => role),
        loginCount: loginByUser.get(user.id)?._count.id ?? 0,
        lastLoginAt: loginByUser.get(user.id)?._max.createdAt ?? null,
        requestCount: requestsByUser.get(user.id)?._count.id ?? 0,
      })),
    };
  }
}
