import { Controller, Inject, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthenticationGuard } from '../auth/authentication.guard.js';
import { RealtimeService } from './realtime.service.js';

@ApiTags('realtime')
@Controller('realtime')
@UseGuards(AuthenticationGuard)
export class RealtimeController {
  constructor(
    @Inject(RealtimeService) private readonly realtime: RealtimeService,
  ) {}

  @Post('businesses/live')
  @ApiOperation({
    summary: 'Get a sealed live query for public approved businesses',
  })
  sealApprovedBusinesses() {
    return this.realtime.sealApprovedBusinesses();
  }
}
