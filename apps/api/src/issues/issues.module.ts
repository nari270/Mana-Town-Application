import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import {
  IssueAdministrationController,
  IssuesController,
} from './issues.controller.js';
import { IssuesService } from './issues.service.js';

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [IssuesController, IssueAdministrationController],
  providers: [IssuesService],
})
export class IssuesModule {}
