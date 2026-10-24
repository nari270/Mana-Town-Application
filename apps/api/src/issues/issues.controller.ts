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
  AdminIssueQueryDto,
  CreateIssueDto,
  UpdateIssueStatusDto,
} from './issue.dto.js';
import { IssuesService } from './issues.service.js';

@ApiTags('issues')
@Controller('issues')
@UseGuards(MockAuthenticationGuard, RolesGuard)
export class IssuesController {
  constructor(private readonly issues: IssuesService) {}

  @Post()
  @Roles(
    UserRole.RESIDENT,
    UserRole.BUSINESS_OWNER,
    UserRole.WOMEN_ENTREPRENEUR,
  )
  @ApiOperation({ summary: 'Submit a private local issue report' })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() input: CreateIssueDto,
  ) {
    return this.issues.create(user.id, input);
  }

  @Get('mine')
  @Roles(
    UserRole.RESIDENT,
    UserRole.BUSINESS_OWNER,
    UserRole.WOMEN_ENTREPRENEUR,
  )
  @ApiOperation({ summary: 'List only the signed-in user’s own reports' })
  listMine(@CurrentUser() user: AuthenticatedUser) {
    return this.issues.listMine(user.id);
  }

  @Get(':id')
  @Roles(
    UserRole.RESIDENT,
    UserRole.BUSINESS_OWNER,
    UserRole.WOMEN_ENTREPRENEUR,
    UserRole.ADMIN,
  )
  @ApiOperation({ summary: 'Read a report owned by the current user or admin' })
  getById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.issues.getForUser(id, user);
  }
}

@ApiTags('admin/issues')
@Controller('admin/issues')
@UseGuards(MockAuthenticationGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class IssueAdministrationController {
  constructor(private readonly issues: IssuesService) {}

  @Get()
  @ApiOperation({ summary: 'Browse private issue reports as an administrator' })
  list(@Query() query: AdminIssueQueryDto) {
    return this.issues.listForAdmin(query);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update an issue status and internal notes' })
  updateStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() input: UpdateIssueStatusDto,
  ) {
    return this.issues.updateStatus(id, user.id, input);
  }
}
