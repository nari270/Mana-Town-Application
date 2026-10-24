import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { MockAuthenticationGuard } from './mock-auth.guard.js';
import { RolesGuard } from './roles.guard.js';

@Module({
  imports: [PrismaModule],
  providers: [MockAuthenticationGuard, RolesGuard],
  exports: [MockAuthenticationGuard, RolesGuard],
})
export class AuthModule {}
