import { Type } from 'class-transformer';
import {
  IsInt,
  IsDefined,
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

export class BusinessQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  pageSize = 20;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  locality?: string;

  @ValidateIf((query: BusinessQueryDto) => query.longitude !== undefined)
  @IsDefined()
  @Type(() => Number)
  @IsLatitude()
  latitude?: number;

  @ValidateIf((query: BusinessQueryDto) => query.latitude !== undefined)
  @IsDefined()
  @Type(() => Number)
  @IsLongitude()
  longitude?: number;
}
