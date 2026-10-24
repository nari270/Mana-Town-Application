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
import { LoginDto, RefreshDto, RegisterDto } from './auth.dto.js';
import { AuthService } from './auth.service.js';
import { CurrentUser } from './current-user.decorator.js';
import type { AuthenticatedUser } from './auth.types.js';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(@Inject(AuthService) private readonly auth: AuthService) {}

  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Sign in with an email and password' })
  login(@Body() input: LoginDto, @Req() request: Request) {
    return this.auth.login(
      input.email,
      input.password,
      request.ip ?? 'unknown',
      request.headers['user-agent'],
    );
  }

  @Post('register')
  @HttpCode(201)
  @ApiOperation({ summary: 'Create a customer account with email' })
  register(@Body() input: RegisterDto, @Req() request: Request) {
    return this.auth.register(
      input.email,
      input.password,
      input.displayName,
      request.ip ?? 'unknown',
      request.headers['user-agent'],
    );
  }

  @Post('refresh')
  @HttpCode(200)
  @ApiOperation({ summary: 'Refresh a Supabase Auth session' })
  refresh(@Body() input: RefreshDto) {
    return this.auth.refresh(input.refreshToken);
  }

  @Post('logout')
  @HttpCode(200)
  @UseGuards(AuthenticationGuard)
  @ApiOperation({ summary: 'Sign out and revoke the current session' })
  logout(@Req() request: Request) {
    const header = request.headers.authorization;
    const token = header?.startsWith('Bearer ') ? header.slice(7) : '';
    return this.auth.logout(token);
  }

  @Get('me')
  @UseGuards(AuthenticationGuard)
  @ApiOperation({ summary: 'Get the signed-in user' })
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.auth.profile(user.authUserId);
  }
}
