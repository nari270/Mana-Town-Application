import {
  CallHandler,
  ExecutionContext,
  Inject,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import type { Request } from 'express';
import { defer, from, lastValueFrom, Observable } from 'rxjs';
import { PrismaService } from './prisma.service.js';
import type { AuthenticatedRequest } from '../auth/auth.types.js';

@Injectable()
export class RequestTransactionInterceptor implements NestInterceptor {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle();
    const request = context
      .switchToHttp()
      .getRequest<Request & AuthenticatedRequest>();
    return defer(() =>
      from(
        this.prisma.withRequestContext(request.user?.authUserId ?? null, () =>
          lastValueFrom(next.handle()),
        ),
      ),
    );
  }
}
