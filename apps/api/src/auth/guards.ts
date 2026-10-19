import { type CanActivate, type ExecutionContext, Inject, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import type { Role } from '@repo/db';
import { ForbiddenError } from '../common/errors';
import { IS_PUBLIC, ROLES } from './decorators';
import { TokensService, UnauthenticatedError } from './tokens.service';

export type AuthUserRef = { id: string; roles: Role[] };
export type AuthedRequest = Request & { user?: AuthUserRef };

const bearer = (req: Request) => {
  const h = req.headers.authorization;
  return h?.startsWith('Bearer ') ? h.slice(7).trim() : undefined;
};

/**
 * Global sign-in guard: every route needs a valid access token unless marked @Public(). On
 * public routes a valid token is still read, so handlers can personalise (e.g. favourites).
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(TokensService) private readonly tokens: TokensService,
  ) {}

  async canActivate(ctx: ExecutionContext) {
    const req = ctx.switchToHttp().getRequest<AuthedRequest>();
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [ctx.getHandler(), ctx.getClass()]);
    const token = bearer(req);
    if (!token) {
      if (isPublic) return true;
      throw new UnauthenticatedError();
    }
    try {
      const claims = await this.tokens.verifyAccess(token);
      req.user = { id: claims.sub, roles: claims.roles };
    } catch (e) {
      if (!isPublic) throw e;
    }
    return true;
  }
}

/** Role check for routes marked @Roles(...). SUPER_ADMIN passes every role check. */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(@Inject(Reflector) private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext) {
    const required = this.reflector.getAllAndOverride<Role[] | undefined>(ROLES, [ctx.getHandler(), ctx.getClass()]);
    if (!required?.length) return true;
    const user = ctx.switchToHttp().getRequest<AuthedRequest>().user;
    if (!user) throw new UnauthenticatedError();
    if (user.roles.includes('SUPER_ADMIN') || user.roles.some((r) => required.includes(r))) return true;
    throw new ForbiddenError();
  }
}
