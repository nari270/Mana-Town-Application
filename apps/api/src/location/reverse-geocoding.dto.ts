import { Type } from 'class-transformer';
import { IsLatitude, IsLongitude, IsString, MaxLength } from 'class-validator';

export class ReverseGeocodingQueryDto {
  @Type(() => Number)
  @IsLatitude()
  latitude!: number;

  @Type(() => Number)
  @IsLongitude()
  longitude!: number;

  @IsString()
  @MaxLength(2)
  language = 'en';
}
