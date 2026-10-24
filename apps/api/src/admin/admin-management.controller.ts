import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import { MockAuthenticationGuard } from '../auth/mock-auth.guard.js';
import { Roles, RolesGuard } from '../auth/roles.guard.js';
import {
  AdminUserQueryDto,
  AdvertisementCampaignDto,
  BusinessCategoryDto,
  UpdateAdvertisementCampaignDto,
  UpdateBusinessCategoryDto,
  UpdateUserRolesDto,
} from './admin-management.dto.js';
import { AdminManagementService } from './admin-management.service.js';

@ApiTags('admin')
@Controller('admin')
@UseGuards(MockAuthenticationGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminManagementController {
  constructor(private readonly management: AdminManagementService) {}

  @Get('users')
  @ApiOperation({ summary: 'List users and their assigned roles' })
  listUsers(@Query() query: AdminUserQueryDto) {
    return this.management.listUsers(query);
  }

  @Patch('users/:id/roles')
  @ApiOperation({ summary: 'Update a user’s roles with an audit record' })
  updateUserRoles(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() input: UpdateUserRolesDto,
  ) {
    return this.management.updateUserRoles(user.id, id, input);
  }

  @Get('business-categories')
  @ApiOperation({ summary: 'List business categories for administration' })
  listCategories() {
    return this.management.listCategories();
  }

  @Post('business-categories')
  @ApiOperation({ summary: 'Create a bilingual business category' })
  createCategory(
    @CurrentUser() user: AuthenticatedUser,
    @Body() input: BusinessCategoryDto,
  ) {
    return this.management.createCategory(input, user.id);
  }

  @Patch('business-categories/:id')
  @ApiOperation({ summary: 'Update a bilingual business category' })
  updateCategory(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() input: UpdateBusinessCategoryDto,
  ) {
    return this.management.updateCategory(id, input, user.id);
  }

  @Get('advertisements')
  @ApiOperation({ summary: 'List campaigns for administration' })
  listCampaigns() {
    return this.management.listCampaigns();
  }

  @Post('advertisements')
  @ApiOperation({ summary: 'Create an administrator-managed ad campaign' })
  createCampaign(
    @CurrentUser() user: AuthenticatedUser,
    @Body() input: AdvertisementCampaignDto,
  ) {
    return this.management.createCampaign(input, user.id);
  }

  @Patch('advertisements/:id')
  @ApiOperation({ summary: 'Update an ad campaign schedule or state' })
  updateCampaign(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() input: UpdateAdvertisementCampaignDto,
  ) {
    return this.management.updateCampaign(id, input, user.id);
  }
}

@ApiTags('advertisements')
@Controller('advertisements')
export class AdvertisementsController {
  constructor(private readonly management: AdminManagementService) {}

  @Get()
  @ApiOperation({ summary: 'List active, date-eligible sponsored campaigns' })
  list(@Query('placement') placement?: string) {
    return this.management.listPublicAdvertisements(placement);
  }

  @Post(':id/events')
  @ApiOperation({
    summary: 'Record an eligible advertisement impression or click',
  })
  track(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() input: import('./admin-management.dto.js').AdvertisementEventDto,
  ) {
    return this.management.trackAdvertisement(id, input.kind);
  }
}
