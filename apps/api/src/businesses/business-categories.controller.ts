import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { BusinessesService } from './businesses.service.js';

@ApiTags('businesses')
@Controller('business-categories')
export class BusinessCategoriesController {
  constructor(private readonly businesses: BusinessesService) {}

  @Get()
  @ApiOperation({ summary: 'List business directory categories' })
  list() {
    return this.businesses.listCategories();
  }
}
