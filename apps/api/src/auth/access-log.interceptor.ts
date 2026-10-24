import {
  CallHandler,
  ExecutionContext,
  HttpException,
  Inject,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import type { Response } from 'express';
import { Observable, tap } from 'rxjs';
import { AccessLogService } from './access-log.service.js';
import type { AuthenticatedRequest } from './auth.types.js';

// High-frequency housekeeping calls would drown the audit trail.
const IGNORED_PATHS = ['/api/v1/auth/me', '/api/v1/admin/access'];

@Injectable()
export class AccessLogInterceptor implements NestInterceptor {
  constructor(
    @Inject(AccessLogService) private readonly accessLog: AccessLogService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle();
    const http = context.switchToHttp();
    const request = http.getRequest<AuthenticatedRequest>();
    const response = http.getResponse<Response>();
    // Guards run first, so anonymous and rejected requests have no user here.
    const user = request.user;
    const path = (request.originalUrl ?? request.url).split('?')[0] ?? '';
    if (!user || IGNORED_PATHS.some((prefix) => path.startsWith(prefix))) {
      return next.handle();
    }

    const write = (statusCode: number) =>
      this.accessLog.record({
        userId: user.id,
        event: 'REQUEST',
        method: request.method,
        path,
        statusCode,
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
      });
    return next.handle().pipe(
      tap({
        next: () => write(response.statusCode),
        error: (error: unknown) =>
          write(error instanceof HttpException ? error.getStatus() : 500),
      }),
    );
  }
}
