import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import {
  EntrepreneurAdministrationController,
  EntrepreneurClassificationRequestController,
  EntrepreneursController,
} from './entrepreneurs.controller.js';
import { EntrepreneursService } from './entrepreneurs.service.js';

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [
    EntrepreneursController,
    EntrepreneurClassificationRequestController,
    EntrepreneurAdministrationController,
  ],
  providers: [EntrepreneursService],
})
export class EntrepreneursModule {}
