import { Type } from 'class-transformer';
import { BusinessStatus } from '@prisma/client';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Max,
  MinLength,
  Min,
} from 'class-validator';

export class AdminBusinessQueryDto {
  @IsOptional()
  @IsEnum(BusinessStatus)
  status?: BusinessStatus;

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
}

export class BusinessRejectionDto {
  @IsString()
  @MinLength(5)
  @MaxLength(1000)
  reason!: string;
}
