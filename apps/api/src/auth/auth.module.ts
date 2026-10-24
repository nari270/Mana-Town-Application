import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { PrismaModule } from '../prisma/prisma.module.js';
import { AccessLogController } from './access-log.controller.js';
import { AccessLogInterceptor } from './access-log.interceptor.js';
import { AccessLogService } from './access-log.service.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { AuthenticationGuard } from './authentication.guard.js';
import { RolesGuard } from './roles.guard.js';

@Module({
  imports: [PrismaModule],
  controllers: [AuthController, AccessLogController],
  providers: [
    AuthService,
    AuthenticationGuard,
    RolesGuard,
    AccessLogService,
    { provide: APP_INTERCEPTOR, useClass: AccessLogInterceptor },
  ],
  exports: [AuthenticationGuard, RolesGuard, AccessLogService],
})
export class AuthModule {}
