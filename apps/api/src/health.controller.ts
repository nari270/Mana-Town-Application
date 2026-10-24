import {
  Controller,
  Get,
  Inject,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  PrismaService,
  type DatabaseReadiness,
} from './prisma/prisma.service.js';

@ApiTags('health')
@Controller('health')
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(
    @Inject(PrismaService) private readonly database: DatabaseReadiness,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Check API process liveness' })
  getHealth() {
    return { status: 'ok' as const, service: 'mana-town-api' };
  }

  @Get('ready')
  @ApiOperation({ summary: 'Check API and database readiness' })
  async getReadiness() {
    try {
      await this.database.checkConnection();
      return {
        status: 'ok' as const,
        service: 'mana-town-api',
        database: 'ok',
      };
    } catch (error) {
      this.logger.error(
        'Database readiness check failed.',
        error instanceof Error ? error.stack : String(error),
      );
      throw new ServiceUnavailableException({
        status: 'error',
        service: 'mana-town-api',
        database: 'unavailable',
      });
    }
  }
}
