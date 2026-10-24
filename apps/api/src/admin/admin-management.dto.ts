import { Type } from 'class-transformer';
import {
  AdvertisementEventKind,
  AdvertisementStatus,
  UserRole,
} from '@prisma/client';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { PartialType } from '@nestjs/swagger';

export class AdminUserQueryDto {
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

export class UpdateUserRolesDto {
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(3)
  @IsEnum(UserRole, { each: true })
  roles!: UserRole[];
}

export class BusinessCategoryDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  nameEnglish!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  nameTelugu!: string;

  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  @MaxLength(100)
  slug!: string;
}

export class UpdateBusinessCategoryDto extends PartialType(
  BusinessCategoryDto,
) {}

export class AdvertisementCampaignDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @IsUUID()
  businessId?: string;

  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  @MaxLength(80)
  placement!: string;

  @IsDateString()
  startsAt!: string;

  @IsDateString()
  endsAt!: string;

  @IsEnum(AdvertisementStatus)
  status!: AdvertisementStatus;
}

export class UpdateAdvertisementCampaignDto extends PartialType(
  AdvertisementCampaignDto,
) {}

export class AdvertisementEventDto {
  @IsEnum(AdvertisementEventKind)
  kind!: AdvertisementEventKind;
}
