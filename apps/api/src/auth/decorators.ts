import { type ExecutionContext, SetMetadata, createParamDecorator } from '@nestjs/common';
import type { Role } from '@repo/db';
import type { AuthedRequest } from './guards';

export const IS_PUBLIC = 'auth:public';
export const ROLES = 'auth:roles';

/** Route needs no sign-in (catalogue, health, sign-in itself). Everything else does. */
export const Public = () => SetMetadata(IS_PUBLIC, true);

/** Route needs one of these roles (checked after sign-in). */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES, roles);

/** The signed-in user's id and roles, from the access token. */
export const CurrentUser = createParamDecorator((_: unknown, ctx: ExecutionContext) => ctx.switchToHttp().getRequest<AuthedRequest>().user);
