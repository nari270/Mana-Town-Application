import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { AuthenticationGuard } from './authentication.guard.js';
import { RolesGuard } from './roles.guard.js';

@Module({
  imports: [PrismaModule],
  controllers: [AuthController],
  providers: [AuthService, AuthenticationGuard, RolesGuard],
  exports: [AuthenticationGuard, RolesGuard],
})
export class AuthModule {}
