import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { AsyncLocalStorage } from 'node:async_hooks';

export interface DatabaseReadiness {
  checkConnection(): Promise<void>;
}

type RequestDatabaseScope = {
  transaction: Prisma.TransactionClient;
  authUserId: string | null;
};

const requestDatabaseScope = new AsyncLocalStorage<RequestDatabaseScope>();
const modelDelegates = new Set([
  'user',
  'userProfile',
  'userRoleAssignment',
  'businessCategory',
  'business',
  'businessOwnership',
  'businessCategoryAssignment',
  'businessImage',
  'businessHour',
  'businessModerationHistory',
  'entrepreneurClassification',
  'issueReport',
  'issueAttachment',
  'issueStatusHistory',
  'issueInternalNote',
  'advertisementCampaign',
  'advertisementAsset',
  'advertisementEvent',
  'auditLog',
  'accessLog',
  'businessView',
  'appConfiguration',
  'featureFlag',
]);

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy, DatabaseReadiness
{
  constructor() {
    super();
    return new Proxy(this, {
      get: (target, property, receiver) => {
        const scope = requestDatabaseScope.getStore();
        if (scope && typeof property === 'string') {
          if (modelDelegates.has(property)) {
            return Reflect.get(scope.transaction, property, scope.transaction);
          }
          if (
            property === '$queryRaw' ||
            property === '$queryRawUnsafe' ||
            property === '$executeRaw' ||
            property === '$executeRawUnsafe'
          ) {
            return Reflect.get(scope.transaction, property, scope.transaction);
          }
          if (property === '$transaction') {
            return (operation: unknown) => {
              if (Array.isArray(operation)) return Promise.all(operation);
              if (typeof operation === 'function') {
                return operation(scope.transaction);
              }
              throw new Error('Unsupported nested Prisma transaction.');
            };
          }
        }
        return Reflect.get(target, property, receiver);
      },
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  async checkConnection() {
    await this.$queryRaw`SELECT 1`;
  }

  async withRequestContext<T>(
    authUserId: string | null,
    operation: () => Promise<T>,
  ): Promise<T> {
    return super.$transaction(async (transaction) => {
      await transaction.$executeRawUnsafe('SET LOCAL ROLE authenticated');
      await transaction.$executeRaw`
        SELECT set_config('request.jwt.claim.sub', ${authUserId ?? ''}, true)
      `;
      return requestDatabaseScope.run({ transaction, authUserId }, operation);
    });
  }

  async setRequestIdentity(authUserId: string): Promise<void> {
    const scope = requestDatabaseScope.getStore();
    if (!scope) {
      throw new Error('A request-scoped database transaction is required.');
    }
    await scope.transaction.$executeRaw`
      SELECT set_config('request.jwt.claim.sub', ${authUserId}, true)
    `;
    scope.authUserId = authUserId;
  }

  currentAuthUserId(): string {
    const authUserId = requestDatabaseScope.getStore()?.authUserId;
    if (!authUserId) {
      throw new Error('An authenticated request identity is required.');
    }
    return authUserId;
  }

  runAsService<T>(operation: () => Promise<T>): Promise<T> {
    return requestDatabaseScope.exit(operation);
  }
}
