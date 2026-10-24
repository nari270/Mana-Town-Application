import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthenticationGuard } from '../auth/authentication.guard.js';
import { BusinessesService } from './businesses.service.js';

@ApiTags('businesses')
@Controller('business-categories')
@UseGuards(AuthenticationGuard)
export class BusinessCategoriesController {
  constructor(private readonly businesses: BusinessesService) {}

  @Get()
  @ApiOperation({ summary: 'List business directory categories' })
  list() {
    return this.businesses.listCategories();
  }
}
