import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthenticationGuard } from '../auth/authentication.guard.js';
import { ReverseGeocodingQueryDto } from './reverse-geocoding.dto.js';
import { ReverseGeocodingService } from './reverse-geocoding.service.js';

@ApiTags('location')
@Controller('location')
@UseGuards(AuthenticationGuard)
export class LocationController {
  constructor(private readonly geocoding: ReverseGeocodingService) {}

  @Get('reverse')
  @ApiOperation({
    summary: 'Find the locality for the signed-in user’s current coordinates',
  })
  reverse(@Query() query: ReverseGeocodingQueryDto) {
    return this.geocoding.getLocality(
      query.latitude,
      query.longitude,
      query.language,
    );
  }
}
