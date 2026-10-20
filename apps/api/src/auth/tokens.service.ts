import { createHmac, randomBytes } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { SignJWT, jwtVerify } from 'jose';
import type { Role } from '@repo/db';
import { DomainError } from '../common/errors';
import { ENV, type Env } from '../config/env';
import { PrismaService } from '../prisma/prisma.service';

export const ACCESS_TTL_SECONDS = 15 * 60; // trd §1: 15-minute access tokens
export const REFRESH_TTL_DAYS = 30;

const ISSUER = 'booktheinfluencer-api';
const AUDIENCE = 'booktheinfluencer';

export const MFA_TTL_SECONDS = 5 * 60;

export type AccessClaims = { sub: string; roles: Role[]; amr: AuthMethod };
/** How a session was opened. Only 'mfa' (password + authenticator) sessions may carry staff roles (trd §10). */
export type AuthMethod = 'mfa' | 'otp';
const STAFF: readonly Role[] = ['SUPER_ADMIN', 'SALES', 'TALENT_MANAGER', 'OPS', 'ACCOUNTS'];
/** The roles a session actually carries: staff roles only with MFA. */
export const sessionRoles = (roles: readonly Role[], method: AuthMethod) => (method === 'mfa' ? [...roles] : roles.filter((r) => !STAFF.includes(r)));

export class UnauthenticatedError extends DomainError {
  constructor(code = 'UNAUTHENTICATED', message = 'Sign in to continue.') {
    super(code, message, 401);
  }
}

/**
 * Access tokens (JWT, HS256) and rotating refresh tokens (AUTH-5). Refresh tokens are random
 * 32-byte values; only their HMAC is stored. Re-presenting a token that was already rotated means
 * it leaked, so every session for that user is revoked.
 */
@Injectable()
export class TokensService {
  private readonly accessKey: Uint8Array;

  constructor(
    @Inject(ENV) private readonly env: Env,
    @Inject(PrismaService) private readonly prisma: PrismaService,
  ) {
    this.accessKey = new TextEncoder().encode(env.JWT_ACCESS_SECRET);
  }

  async signAccess(user: { id: string; roles: Role[] }, method: AuthMethod) {
    return new SignJWT({ roles: sessionRoles(user.roles, method), amr: method, typ: 'access' })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(user.id)
      .setIssuer(ISSUER)
      .setAudience(AUDIENCE)
      .setIssuedAt()
      .setExpirationTime(`${ACCESS_TTL_SECONDS}s`)
      .sign(this.accessKey);
  }

  async verifyAccess(token: string): Promise<AccessClaims> {
    try {
      const { payload } = await jwtVerify(token, this.accessKey, { issuer: ISSUER, audience: AUDIENCE, algorithms: ['HS256'] });
      if (payload.typ !== 'access' || typeof payload.sub !== 'string' || !Array.isArray(payload.roles)) throw new Error('bad claims');
      const amr: AuthMethod = payload.amr === 'mfa' ? 'mfa' : 'otp';
      // Defence in depth: even a token minted elsewhere can't carry staff roles without MFA.
      return { sub: payload.sub, roles: sessionRoles(payload.roles as Role[], amr), amr };
    } catch {
      throw new UnauthenticatedError('TOKEN_INVALID', 'Your session has expired. Sign in again.');
    }
  }

  /** Short-lived token proving step 1 of staff sign-in (password) passed; only good for /auth/mfa/verify. */
  async signMfa(userId: string) {
    return new SignJWT({ typ: 'mfa' })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(userId)
      .setIssuer(ISSUER)
      .setAudience(AUDIENCE)
      .setIssuedAt()
      .setExpirationTime(`${MFA_TTL_SECONDS}s`)
      .sign(this.accessKey);
  }

  async verifyMfa(token: string): Promise<string> {
    try {
      const { payload } = await jwtVerify(token, this.accessKey, { issuer: ISSUER, audience: AUDIENCE, algorithms: ['HS256'] });
      if (payload.typ !== 'mfa' || typeof payload.sub !== 'string') throw new Error('bad claims');
      return payload.sub;
    } catch {
      throw new UnauthenticatedError('MFA_TOKEN_INVALID', 'Your sign-in took too long. Enter your email and password again.');
    }
  }

  private hash(token: string) {
    return createHmac('sha256', this.env.AUTH_SECRET).update(token).digest('hex');
  }

  /** New refresh token for a fresh sign-in. Returns the raw token (cookie value). */
  async issueRefresh(userId: string, method: AuthMethod = 'otp') {
    const token = randomBytes(32).toString('base64url');
    await this.prisma.refreshToken.create({
      data: { userId, tokenHash: this.hash(token), authMethod: method, expiresAt: new Date(Date.now() + REFRESH_TTL_DAYS * 86_400_000) },
    });
    return token;
  }

  /** Exchange a refresh token for a new one (rotation). Returns the user and the new raw token. */
  async rotateRefresh(token: string) {
    const existing = await this.prisma.refreshToken.findUnique({ where: { tokenHash: this.hash(token) }, include: { user: true } });
    if (!existing) throw new UnauthenticatedError('SESSION_INVALID', 'Your session has ended. Sign in again.');
    if (existing.revokedAt) {
      // Reuse of a rotated token: assume theft and end every session for this user.
      await this.revokeAll(existing.userId);
      throw new UnauthenticatedError('SESSION_REVOKED', 'For your security we signed you out everywhere. Sign in again.');
    }
    if (existing.expiresAt <= new Date() || existing.user.deletedAt) {
      throw new UnauthenticatedError('SESSION_INVALID', 'Your session has ended. Sign in again.');
    }

    const next = randomBytes(32).toString('base64url');
    // Atomic: only one concurrent refresh can rotate this token.
    await this.prisma.$transaction(async (tx) => {
      const created = await tx.refreshToken.create({
        data: { userId: existing.userId, tokenHash: this.hash(next), authMethod: existing.authMethod, expiresAt: new Date(Date.now() + REFRESH_TTL_DAYS * 86_400_000) },
      });
      const { count } = await tx.refreshToken.updateMany({ where: { id: existing.id, revokedAt: null }, data: { revokedAt: new Date(), replacedBy: created.id } });
      if (count !== 1) throw new UnauthenticatedError('SESSION_INVALID', 'Your session has ended. Sign in again.');
    });
    return { user: existing.user, token: next, method: (existing.authMethod === 'mfa' ? 'mfa' : 'otp') as AuthMethod };
  }

  /** Logout: revoke this refresh token (no error if it's unknown or already revoked). */
  async revokeRefresh(token: string) {
    await this.prisma.refreshToken.updateMany({ where: { tokenHash: this.hash(token), revokedAt: null }, data: { revokedAt: new Date() } });
  }

  async revokeAll(userId: string) {
    await this.prisma.refreshToken.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
  }
}
