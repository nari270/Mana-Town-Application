import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { AuthenticationGuard } from './authentication.guard.js';
import { LoginDto } from './auth.dto.js';
import { AuthService } from './auth.service.js';
import { CurrentUser } from './current-user.decorator.js';
import type { AuthenticatedUser } from './auth.types.js';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(@Inject(AuthService) private readonly auth: AuthService) {}

  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Sign in with a username and password' })
  login(@Body() input: LoginDto, @Req() request: Request) {
    return this.auth.login(
      input.username,
      input.password,
      request.ip ?? 'unknown',
      request.headers['user-agent'],
    );
  }

  @Get('me')
  @UseGuards(AuthenticationGuard)
  @ApiOperation({ summary: 'Get the signed-in user' })
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.auth.profile(user.id);
  }
}
