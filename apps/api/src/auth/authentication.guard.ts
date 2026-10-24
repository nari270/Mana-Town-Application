import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuthService } from './auth.service.js';
import type { AuthenticatedRequest } from './auth.types.js';

@Injectable()
export class AuthenticationGuard implements CanActivate {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuthService) private readonly auth: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const header = request.headers.authorization;
    const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;
    if (!token) throw new UnauthorizedException('Sign in to continue.');

    const authUser = await this.auth.verifyAccessToken(token);
    if (!authUser) {
      throw new UnauthorizedException(
        'Your session has expired. Sign in again.',
      );
    }

    const user = await this.prisma.withRequestContext(authUser.id, () =>
      this.prisma.user.findUnique({
        where: { authUserId: authUser.id },
        select: { id: true, roles: { select: { role: true } } },
      }),
    );
    if (!user) throw new UnauthorizedException('Unknown account.');

    request.user = {
      id: user.id,
      authUserId: authUser.id,
      roles: user.roles.map(({ role }: { role: UserRole }) => role),
    };
    return true;
  }
}
