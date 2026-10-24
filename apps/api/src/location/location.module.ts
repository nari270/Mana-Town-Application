import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { LocationController } from './location.controller.js';
import { ReverseGeocodingService } from './reverse-geocoding.service.js';

@Module({
  imports: [AuthModule],
  controllers: [LocationController],
  providers: [ReverseGeocodingService],
})
export class LocationModule {}
