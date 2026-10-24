import { Controller, Inject, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { RealtimeService } from './realtime.service.js';

@ApiTags('realtime')
@Controller('realtime')
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
