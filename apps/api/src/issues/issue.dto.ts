import { Type } from 'class-transformer';
import { IssueStatus } from '@prisma/client';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class CreateIssueDto {
  @IsString()
  @MinLength(4)
  @MaxLength(160)
  title!: string;

  @IsString()
  @MinLength(10)
  @MaxLength(5000)
  description!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(80)
  category!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  locality!: string;
}

export class AdminIssueQueryDto {
  @IsOptional()
  @IsEnum(IssueStatus)
  status?: IssueStatus;

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

export class UpdateIssueStatusDto {
  @IsEnum(IssueStatus)
  status!: IssueStatus;

  @ValidateIf(
    (value: UpdateIssueStatusDto) => value.status === IssueStatus.RESOLVED,
  )
  @IsString()
  @MinLength(5)
  @MaxLength(2000)
  resolution?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(2000)
  internalNote?: string;
}
