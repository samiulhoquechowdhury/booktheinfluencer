import { Body, Controller, Delete, Get, HttpCode, Inject, Param, Post, Query, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { InviteAcceptSchema, InviteCreateSchema, PageQuerySchema, type InviteAccept, type InviteCreate, type PageQuery } from '@repo/schemas';
import { sessionResponse } from '../auth/auth.controller';
import { toAuthUser } from '../auth/auth-user';
import { CurrentUser, Public, Roles } from '../auth/decorators';
import type { AuthUserRef } from '../auth/guards';
import { TokensService } from '../auth/tokens.service';
import { ZodPipe } from '../common/zod.pipe';
import { ENV, type Env } from '../config/env';
import { InvitesService } from './invites.service';

/** Public: what the invite link opens. */
@Public()
@Controller('invites')
export class InvitesController {
  constructor(
    @Inject(ENV) private readonly env: Env,
    @Inject(InvitesService) private readonly invites: InvitesService,
    @Inject(TokensService) private readonly tokens: TokensService,
  ) {}

  @Get(':token')
  async preview(@Param('token') token: string) {
    return { data: await this.invites.preview(token) };
  }

  @Post(':token/code')
  @HttpCode(202)
  async sendCode(@Param('token') token: string, @Req() req: Request) {
    return { data: await this.invites.sendCode(token, req.ip) };
  }

  /** Talent/rep (phone) invites sign the person in straight away; staff go on to sign in with MFA. */
  @Post(':token/accept')
  @HttpCode(200)
  async accept(@Param('token') token: string, @Body(new ZodPipe(InviteAcceptSchema)) body: InviteAccept, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const { user, nextStep } = await this.invites.accept(token, body, req.ip);
    if (nextStep === 'signed-in') {
      const session = await sessionResponse(res, this.env, this.tokens, user, await this.tokens.issueRefresh(user.id));
      return { data: { ...session.data, nextStep } };
    }
    return { data: { user: toAuthUser(user), nextStep } };
  }
}

@Controller('admin/invites')
@Roles('SUPER_ADMIN', 'TALENT_MANAGER')
export class AdminInvitesController {
  constructor(@Inject(InvitesService) private readonly invites: InvitesService) {}

  @Post()
  async create(@Body(new ZodPipe(InviteCreateSchema)) body: InviteCreate, @CurrentUser() actor: AuthUserRef, @Req() req: Request) {
    return { data: await this.invites.create(body, actor, req.ip) };
  }

  @Get()
  list(@Query(new ZodPipe(PageQuerySchema)) q: PageQuery) {
    return this.invites.list(q);
  }

  @Delete(':id')
  @HttpCode(204)
  async revoke(@Param('id') id: string, @CurrentUser() actor: AuthUserRef, @Req() req: Request) {
    await this.invites.revoke(id, actor, req.ip);
  }
}
