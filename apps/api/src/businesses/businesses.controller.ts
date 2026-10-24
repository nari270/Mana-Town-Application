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
import { AuthenticationGuard } from '../auth/authentication.guard.js';
import { Roles, RolesGuard } from '../auth/roles.guard.js';
import { BusinessQueryDto } from './business-query.dto.js';
import { BusinessWriteDto, UpdateBusinessDto } from './business-write.dto.js';
import { BusinessesService } from './businesses.service.js';

@ApiTags('businesses')
@Controller('businesses')
export class BusinessesController {
  constructor(private readonly businesses: BusinessesService) {}

  @Get('mine')
  @UseGuards(AuthenticationGuard, RolesGuard)
  @Roles(UserRole.BUSINESS_OWNER, UserRole.ADMIN)
  @ApiOperation({ summary: 'List the signed-in owner’s businesses' })
  listMine(@CurrentUser() user: AuthenticatedUser) {
    return this.businesses.listMine(user.id);
  }

  @Get('mine/stats')
  @UseGuards(AuthenticationGuard, RolesGuard)
  @Roles(UserRole.BUSINESS_OWNER, UserRole.ADMIN)
  @ApiOperation({ summary: 'View counts for the signed-in owner’s businesses' })
  viewStats(@CurrentUser() user: AuthenticatedUser) {
    return this.businesses.viewStats(user.id);
  }

  @Post()
  @UseGuards(AuthenticationGuard, RolesGuard)
  @Roles(UserRole.BUSINESS_OWNER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a draft business listing' })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() input: BusinessWriteDto,
  ) {
    return this.businesses.createOwned(user.id, input);
  }

  @Patch(':id')
  @UseGuards(AuthenticationGuard, RolesGuard)
  @Roles(UserRole.BUSINESS_OWNER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Edit an owned business listing' })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() input: UpdateBusinessDto,
  ) {
    return this.businesses.updateOwned(user.id, id, input);
  }

  @Post(':id/submit')
  @UseGuards(AuthenticationGuard, RolesGuard)
  @Roles(UserRole.BUSINESS_OWNER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Submit a draft or corrected business for review' })
  submit(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.businesses.submitOwned(user.id, id);
  }

  @Get()
  @UseGuards(AuthenticationGuard)
  @ApiOperation({ summary: 'Search approved business listings (signed in)' })
  list(@Query() query: BusinessQueryDto) {
    return this.businesses.list(query);
  }

  @Get(':id')
  @UseGuards(AuthenticationGuard)
  @ApiOperation({ summary: 'Get an approved business listing (signed in)' })
  async getById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    const business = await this.businesses.getById(id);
    await this.businesses.recordView(id, user.id);
    return business;
  }
}
