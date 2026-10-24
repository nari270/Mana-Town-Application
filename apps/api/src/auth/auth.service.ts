import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { verifyPassword } from './password.js';
import { createToken, requireAuthSecret } from './token.js';

const TOKEN_TTL_SECONDS = 8 * 60 * 60;
const MAX_FAILURES = 5;
const LOCK_WINDOW_MS = 15 * 60 * 1000;
// Used so unknown usernames cost the same as wrong passwords.
const DUMMY_HASH = `scrypt$${Buffer.alloc(16).toString('base64')}$${Buffer.alloc(64).toString('base64')}`;

@Injectable()
export class AuthService {
  private readonly failures = new Map<
    string,
    { count: number; first: number }
  >();

  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async login(username: string, password: string, clientKey: string) {
    const key = `${clientKey}|${username.toLowerCase()}`;
    this.assertNotLocked(key);

    const user = await this.prisma.user.findUnique({
      where: { username: username.toLowerCase() },
      select: {
        id: true,
        displayName: true,
        passwordHash: true,
        roles: { select: { role: true } },
      },
    });
    const valid = await verifyPassword(
      password,
      user?.passwordHash ?? DUMMY_HASH,
    );
    if (!user || !user.passwordHash || !valid) {
      this.recordFailure(key);
      throw new UnauthorizedException('Incorrect username or password.');
    }

    this.failures.delete(key);
    const secret = requireAuthSecret(process.env.AUTH_JWT_SECRET);
    return {
      token: createToken(user.id, secret, TOKEN_TTL_SECONDS),
      expiresIn: TOKEN_TTL_SECONDS,
      user: {
        id: user.id,
        displayName: user.displayName,
        roles: user.roles.map(({ role }) => role),
      },
    };
  }

  async profile(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        id: true,
        displayName: true,
        roles: { select: { role: true } },
      },
    });
    return {
      id: user.id,
      displayName: user.displayName,
      roles: user.roles.map(({ role }) => role),
    };
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
        'Too many failed attempts. Try again in 15 minutes.',
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
