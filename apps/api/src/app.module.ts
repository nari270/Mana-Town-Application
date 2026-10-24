import { Module } from '@nestjs/common';
import { BusinessesModule } from './businesses/businesses.module.js';
import { HealthController } from './health.controller.js';
import { IssuesModule } from './issues/issues.module.js';
import { EntrepreneursModule } from './entrepreneurs/entrepreneurs.module.js';
import { AdminModule } from './admin/admin.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { RealtimeModule } from './realtime/realtime.module.js';

@Module({
  controllers: [HealthController],
  imports: [
    PrismaModule,
    BusinessesModule,
    IssuesModule,
    EntrepreneursModule,
    AdminModule,
    RealtimeModule,
  ],
})
export class AppModule {}
