import { Module } from '@nestjs/common';
import { BusinessCategoriesController } from './business-categories.controller.js';
import { BusinessAdministrationController } from './business-administration.controller.js';
import { BusinessesController } from './businesses.controller.js';
import { BusinessesService } from './businesses.service.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [
    BusinessesController,
    BusinessCategoriesController,
    BusinessAdministrationController,
  ],
  providers: [BusinessesService],
})
export class BusinessesModule {}
