import { Controller, Get, Inject, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { AccessLogService } from './access-log.service.js';
import { AuthenticationGuard } from './authentication.guard.js';
import { Roles, RolesGuard } from './roles.guard.js';

export class AccessLogQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize = 50;

  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsOptional()
  @IsIn(['LOGIN_SUCCESS', 'LOGIN_FAILED', 'REQUEST'])
  event?: string;
}

@ApiTags('admin')
@Controller('admin/access')
@UseGuards(AuthenticationGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AccessLogController {
  constructor(
    @Inject(AccessLogService) private readonly accessLog: AccessLogService,
  ) {}

  @Get('summary')
  @ApiOperation({ summary: 'Per-user sign-in and activity totals' })
  summary() {
    return this.accessLog.summary();
  }

  @Get('logs')
  @ApiOperation({ summary: 'Who signed in and what they accessed' })
  logs(@Query() query: AccessLogQueryDto) {
    return this.accessLog.list(query);
  }
}
