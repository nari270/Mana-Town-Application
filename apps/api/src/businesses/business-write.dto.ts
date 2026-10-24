import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDefined,
  IsInt,
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { PartialType } from '@nestjs/swagger';

export class BusinessHourDto {
  @IsInt()
  @Min(0)
  @Max(6)
  weekday!: number;

  @IsBoolean()
  closed!: boolean;

  @ValidateIf((value: BusinessHourDto) => !value.closed)
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  opensAt?: string;

  @ValidateIf((value: BusinessHourDto) => !value.closed)
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  closesAt?: string;
}

export class BusinessCoordinatesDto {
  @IsLatitude()
  latitude!: number;

  @IsLongitude()
  longitude!: number;
}

export class BusinessImageUploadDto {
  @IsOptional()
  @IsString()
  @MaxLength(240)
  altText?: string;
}

export class BusinessWriteDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @IsString()
  @MinLength(10)
  @MaxLength(3000)
  description!: string;

  @IsUUID()
  categoryId!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  locality!: string;

  @IsDefined()
  @ValidateNested()
  @Type(() => BusinessCoordinatesDto)
  coordinates!: BusinessCoordinatesDto;

  @IsString()
  @MinLength(3)
  @MaxLength(300)
  address!: string;

  @IsOptional()
  @Matches(/^\+?[0-9()\-\s]{7,32}$/)
  phone?: string;

  @IsOptional()
  @Matches(/^\+?[0-9()\-\s]{7,32}$/)
  whatsapp?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(7)
  @ValidateNested({ each: true })
  @Type(() => BusinessHourDto)
  hours?: BusinessHourDto[];
}

export class UpdateBusinessDto extends PartialType(BusinessWriteDto) {}
