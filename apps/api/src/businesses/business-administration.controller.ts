import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import { AuthenticationGuard } from '../auth/authentication.guard.js';
import { Roles, RolesGuard } from '../auth/roles.guard.js';
import {
  AdminBusinessQueryDto,
  BusinessRejectionDto,
} from './admin-business-query.dto.js';
import { BusinessesService } from './businesses.service.js';

@ApiTags('admin/businesses')
@Controller('admin/businesses')
@UseGuards(AuthenticationGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class BusinessAdministrationController {
  constructor(private readonly businesses: BusinessesService) {}

  @Get()
  @ApiOperation({ summary: 'List and filter business moderation records' })
  list(@Query() query: AdminBusinessQueryDto) {
    return this.businesses.listForAdmin(query);
  }

  @Post(':id/approve')
  @ApiOperation({ summary: 'Approve a pending business listing' })
  approve(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.businesses.approveBusiness(id, user.id);
  }

  @Post(':id/reject')
  @ApiOperation({ summary: 'Reject a pending business listing with a reason' })
  reject(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() input: BusinessRejectionDto,
  ) {
    return this.businesses.rejectBusiness(id, user.id, input.reason);
  }
}
