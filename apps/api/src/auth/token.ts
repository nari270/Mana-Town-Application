import { createHmac, timingSafeEqual } from 'node:crypto';

const HEADER = Buffer.from(
  JSON.stringify({ alg: 'HS256', typ: 'JWT' }),
).toString('base64url');

export type TokenPayload = { sub: string; iat: number; exp: number };

function sign(data: string, secret: string) {
  return createHmac('sha256', secret).update(data).digest('base64url');
}

export function requireAuthSecret(secret: string | undefined): string {
  if (!secret || secret.length < 32) {
    throw new Error('AUTH_JWT_SECRET must be set to at least 32 characters.');
  }
  return secret;
}

export function createToken(
  userId: string,
  secret: string,
  ttlSeconds: number,
  now = Date.now(),
): string {
  const iat = Math.floor(now / 1000);
  const payload: TokenPayload = { sub: userId, iat, exp: iat + ttlSeconds };
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${HEADER}.${body}.${sign(`${HEADER}.${body}`, secret)}`;
}

export function verifyToken(
  token: string,
  secret: string,
  now = Date.now(),
): TokenPayload | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [header, body, signature] = parts as [string, string, string];
  if (header !== HEADER) return null;
  const expected = Buffer.from(sign(`${header}.${body}`, secret));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    return null;
  }
  try {
    const payload = JSON.parse(
      Buffer.from(body, 'base64url').toString('utf8'),
    ) as TokenPayload;
    if (typeof payload.sub !== 'string' || payload.exp * 1000 <= now) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}
