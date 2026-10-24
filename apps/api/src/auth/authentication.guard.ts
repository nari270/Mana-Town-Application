import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import type { AuthenticatedRequest } from './auth.types.js';
import { requireAuthSecret, verifyToken } from './token.js';

@Injectable()
export class AuthenticationGuard implements CanActivate {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const header = request.headers.authorization;
    const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;
    if (!token) throw new UnauthorizedException('Sign in to continue.');

    const payload = verifyToken(
      token,
      requireAuthSecret(process.env.AUTH_JWT_SECRET),
    );
    if (!payload) {
      throw new UnauthorizedException(
        'Your session has expired. Sign in again.',
      );
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, roles: { select: { role: true } } },
    });
    if (!user) throw new UnauthorizedException('Unknown account.');

    request.user = {
      id: user.id,
      roles: user.roles.map(({ role }: { role: UserRole }) => role),
    };
    return true;
  }
}
