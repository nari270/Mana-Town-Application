import { Type } from 'class-transformer';
import { EntrepreneurClassificationStatus } from '@prisma/client';
import {
  Equals,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class RequestEntrepreneurClassificationDto {
  @Equals(true)
  confirmWomenOwned!: boolean;
}

export class EntrepreneurQueryDto {
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

export class AdminEntrepreneurQueryDto {
  @IsOptional()
  @IsEnum(EntrepreneurClassificationStatus)
  status?: EntrepreneurClassificationStatus;

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

export class RejectEntrepreneurClassificationDto {
  @IsString()
  @MinLength(5)
  @MaxLength(1000)
  reason!: string;
}
