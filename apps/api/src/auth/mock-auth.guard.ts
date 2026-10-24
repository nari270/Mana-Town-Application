import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import type { AuthenticatedRequest } from './auth.types.js';

export function isMockAuthenticationAllowed(
  nodeEnvironment: string | undefined,
  mockAuthEnabled: string | undefined,
) {
  return (
    mockAuthEnabled === 'true' &&
    (nodeEnvironment === 'development' || nodeEnvironment === 'test')
  );
}

@Injectable()
export class MockAuthenticationGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (
      !isMockAuthenticationAllowed(
        process.env.NODE_ENV,
        process.env.MOCK_AUTH_ENABLED,
      )
    ) {
      throw new ServiceUnavailableException(
        'A production authentication provider has not been configured.',
      );
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const userId = request.headers['x-mock-user-id'];
    if (typeof userId !== 'string') {
      throw new UnauthorizedException('Choose a development test identity.');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, roles: { select: { role: true } } },
    });
    if (!user) {
      throw new UnauthorizedException('Unknown development test identity.');
    }

    request.user = {
      id: user.id,
      roles: user.roles.map(({ role }: { role: UserRole }) => role),
    };
    return true;
  }
}
