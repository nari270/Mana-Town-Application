import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { AdminDashboardController } from './admin-dashboard.controller.js';
import {
  AdminManagementController,
  AdvertisementsController,
} from './admin-management.controller.js';
import { AdminManagementService } from './admin-management.service.js';

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [
    AdminDashboardController,
    AdminManagementController,
    AdvertisementsController,
  ],
  providers: [AdminManagementService],
})
export class AdminModule {}
