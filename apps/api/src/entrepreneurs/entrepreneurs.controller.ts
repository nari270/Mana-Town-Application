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
  AdminEntrepreneurQueryDto,
  EntrepreneurQueryDto,
  RejectEntrepreneurClassificationDto,
  RequestEntrepreneurClassificationDto,
} from './entrepreneur.dto.js';
import { EntrepreneursService } from './entrepreneurs.service.js';

@ApiTags('entrepreneurs')
@Controller('entrepreneurs')
export class EntrepreneursController {
  constructor(private readonly entrepreneurs: EntrepreneursService) {}

  @Get()
  @UseGuards(AuthenticationGuard)
  @ApiOperation({ summary: 'Search approved women entrepreneur businesses' })
  list(@Query() query: EntrepreneurQueryDto) {
    return this.entrepreneurs.list(query);
  }

  @Get(':id')
  @UseGuards(AuthenticationGuard)
  @ApiOperation({ summary: 'Read an approved women entrepreneur business' })
  getById(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.entrepreneurs.getById(id);
  }
}

@ApiTags('businesses')
@Controller('businesses')
@UseGuards(AuthenticationGuard, RolesGuard)
@Roles(UserRole.BUSINESS_OWNER, UserRole.ADMIN)
export class EntrepreneurClassificationRequestController {
  constructor(private readonly entrepreneurs: EntrepreneursService) {}

  @Post(':id/entrepreneur-classification')
  @ApiOperation({
    summary: 'Request review of a self-identified women-owned business',
  })
  request(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() _input: RequestEntrepreneurClassificationDto,
  ) {
    return this.entrepreneurs.requestClassification(id, user.id);
  }
}

@ApiTags('admin/entrepreneurs')
@Controller('admin/entrepreneurs')
@UseGuards(AuthenticationGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class EntrepreneurAdministrationController {
  constructor(private readonly entrepreneurs: EntrepreneursService) {}

  @Get()
  @ApiOperation({ summary: 'List entrepreneur classification requests' })
  list(@Query() query: AdminEntrepreneurQueryDto) {
    return this.entrepreneurs.listForAdmin(query);
  }

  @Post(':id/approve')
  @ApiOperation({ summary: 'Approve a women-owned classification request' })
  approve(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.entrepreneurs.approve(id, user.id);
  }

  @Post(':id/reject')
  @ApiOperation({ summary: 'Reject a classification with a reason' })
  reject(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() input: RejectEntrepreneurClassificationDto,
  ) {
    return this.entrepreneurs.reject(id, user.id, input.reason);
  }
}
