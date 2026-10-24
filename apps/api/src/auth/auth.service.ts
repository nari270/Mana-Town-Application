import {
  BadGatewayException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { createClient, type Session } from '@supabase/supabase-js';
import { PrismaService } from '../prisma/prisma.service.js';
import { AccessLogService } from './access-log.service.js';

const MAX_FAILURES = 5;
const LOCK_WINDOW_MS = 15 * 60 * 1000;

function requiredEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} must be configured.`);
  return value;
}

export function getEmailConfirmationRedirectTo() {
  const clientOrigin = requiredEnv('CLIENT_ORIGIN')
    .split(',')
    .map((origin) => origin.trim())
    .find(Boolean);
  if (!clientOrigin) {
    throw new Error('CLIENT_ORIGIN must include a web application origin.');
  }

  const redirect = new URL('/login', clientOrigin);
  if (redirect.protocol !== 'http:' && redirect.protocol !== 'https:') {
    throw new Error('CLIENT_ORIGIN must use HTTP or HTTPS.');
  }
  return redirect.toString();
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly failures = new Map<
    string,
    { count: number; first: number }
  >();

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AccessLogService) private readonly accessLog: AccessLogService,
  ) {}

  async register(
    email: string,
    password: string,
    displayName: string,
    clientKey: string,
    userAgent?: string,
  ) {
    const normalizedEmail = email.trim().toLowerCase();
    const key = `${clientKey}|register|${normalizedEmail}`;
    this.assertNotLocked(key);

    const { data, error } = await this.client().auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        data: { display_name: displayName.trim() },
        emailRedirectTo: getEmailConfirmationRedirectTo(),
      },
    });
    if (error) {
      this.recordFailure(key);
      if (error.status === 400 || error.status === 422) {
        throw new HttpException(
          'Account registration could not be completed.',
          HttpStatus.BAD_REQUEST,
        );
      }
      this.logger.error(`Supabase signup failed: ${error.message}`);
      throw new ServiceUnavailableException(
        'Authentication service is unavailable.',
      );
    }
    if (!data.user) {
      throw new BadGatewayException('Supabase did not return the new account.');
    }

    await this.prisma.setRequestIdentity(data.user.id);
    let user;
    try {
      user = await this.prisma.user.create({
        data: {
          authUserId: data.user.id,
          email: normalizedEmail,
          displayName: displayName.trim(),
          roles: { create: { role: 'CUSTOMER' } },
        },
        select: { id: true },
      });
    } catch (error) {
      const { error: cleanupError } =
        await this.adminClient().auth.admin.deleteUser(data.user.id);
      if (cleanupError) {
        this.logger.error(
          `Supabase account cleanup failed: ${cleanupError.message}`,
        );
      }
      throw error;
    }

    this.failures.delete(key);
    await this.accessLog.record({
      username: normalizedEmail,
      userId: user.id,
      event: 'LOGIN_SUCCESS',
      method: 'POST',
      path: '/api/v1/auth/register',
      statusCode: 201,
      ipAddress: clientKey,
      userAgent,
    });

    if (!data.session) {
      return {
        requiresEmailConfirmation: true,
        message: 'Check your email to confirm your account.',
      };
    }

    return {
      ...this.toSession(data.session, await this.profile(data.user.id)),
      requiresEmailConfirmation: false,
    };
  }

  async login(
    email: string,
    password: string,
    clientKey: string,
    userAgent?: string,
  ) {
    const normalizedEmail = email.trim().toLowerCase();
    const key = `${clientKey}|login|${normalizedEmail}`;
    this.assertNotLocked(key);

    const { data, error } = await this.client().auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });
    if (error || !data.session || !data.user) {
      if (error?.status === 400 || error?.status === 401) {
        this.recordFailure(key);
        await this.accessLog.record({
          username: normalizedEmail,
          event: 'LOGIN_FAILED',
          method: 'POST',
          path: '/api/v1/auth/login',
          statusCode: 401,
          ipAddress: clientKey,
          userAgent,
        });
        throw new UnauthorizedException('Incorrect email or password.');
      }
      this.logger.error(
        `Supabase sign-in failed: ${error?.message ?? 'no session'}`,
      );
      throw new ServiceUnavailableException(
        'Authentication service is unavailable.',
      );
    }

    await this.prisma.setRequestIdentity(data.user.id);
    const user = await this.profile(data.user.id);
    this.failures.delete(key);
    await this.accessLog.record({
      username: normalizedEmail,
      userId: user.id,
      event: 'LOGIN_SUCCESS',
      method: 'POST',
      path: '/api/v1/auth/login',
      statusCode: 200,
      ipAddress: clientKey,
      userAgent,
    });
    return this.toSession(data.session, user);
  }

  async refresh(refreshToken: string) {
    const { data, error } = await this.client().auth.refreshSession({
      refresh_token: refreshToken,
    });
    if (error || !data.session || !data.user) {
      if (error?.status === 400 || error?.status === 401) {
        throw new UnauthorizedException('Your session has expired.');
      }
      this.logger.error(`Supabase token refresh failed: ${error?.message}`);
      throw new ServiceUnavailableException(
        'Authentication service is unavailable.',
      );
    }
    await this.prisma.setRequestIdentity(data.user.id);
    return this.toSession(data.session, await this.profile(data.user.id));
  }

  async logout(accessToken: string) {
    const { error } = await this.adminClient().auth.admin.signOut(accessToken);
    if (error) {
      this.logger.warn(`Supabase sign-out failed: ${error.message}`);
      throw new ServiceUnavailableException('Could not revoke the session.');
    }
    return { success: true };
  }

  async verifyAccessToken(accessToken: string) {
    const { data, error } = await this.client().auth.getUser(accessToken);
    if (!error && data.user) return data.user;
    if (error && (error.status === 401 || error.status === 403)) return null;
    if (error) {
      this.logger.error(`Supabase token verification failed: ${error.message}`);
      throw new ServiceUnavailableException(
        'Authentication service is unavailable.',
      );
    }
    return null;
  }

  async profile(authUserId: string) {
    const user = await this.prisma.user.findUnique({
      where: { authUserId },
      select: {
        id: true,
        authUserId: true,
        displayName: true,
        roles: { select: { role: true } },
      },
    });
    if (!user || !user.authUserId) {
      throw new UnauthorizedException('Unknown account.');
    }
    return {
      id: user.id,
      authUserId: user.authUserId,
      displayName: user.displayName,
      roles: user.roles.map(({ role }) => role),
    };
  }

  private toSession(
    session: Session,
    user: Awaited<ReturnType<AuthService['profile']>>,
  ) {
    return {
      token: session.access_token,
      refreshToken: session.refresh_token,
      expiresIn: session.expires_in,
      user: {
        id: user.id,
        authUserId: user.authUserId,
        displayName: user.displayName,
        roles: user.roles,
      },
    };
  }

  private client() {
    return createClient(
      requiredEnv('SUPABASE_URL'),
      requiredEnv('SUPABASE_PUBLISHABLE_KEY'),
      {
        auth: {
          autoRefreshToken: false,
          detectSessionInUrl: false,
          persistSession: false,
        },
      },
    );
  }

  private adminClient() {
    return createClient(
      requiredEnv('SUPABASE_URL'),
      requiredEnv('SUPABASE_SECRET_KEY'),
      {
        auth: {
          autoRefreshToken: false,
          detectSessionInUrl: false,
          persistSession: false,
        },
      },
    );
  }

  private assertNotLocked(key: string) {
    const entry = this.failures.get(key);
    if (!entry) return;
    if (Date.now() - entry.first > LOCK_WINDOW_MS) {
      this.failures.delete(key);
      return;
    }
    if (entry.count >= MAX_FAILURES) {
      throw new HttpException(
        'Too many attempts. Try again in 15 minutes.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  private recordFailure(key: string) {
    const entry = this.failures.get(key);
    if (!entry || Date.now() - entry.first > LOCK_WINDOW_MS) {
      this.failures.set(key, { count: 1, first: Date.now() });
    } else {
      entry.count += 1;
    }
  }
}
