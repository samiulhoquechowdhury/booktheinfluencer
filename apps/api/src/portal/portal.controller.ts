import { Body, Controller, Delete, Get, Inject, Param, Put, Req } from '@nestjs/common';
import type { Request } from 'express';
import { IsoDateSchema } from '@repo/schemas';
import { z } from 'zod';
import { CurrentUser, Roles } from '../auth/decorators';
import type { AuthUserRef } from '../auth/guards';
import { ZodPipe } from '../common/zod.pipe';
import { PortalService } from './portal.service';

const BlackoutBody = z.object({ reason: z.string().trim().max(80).nullable().default(null) });

/** Talent portal (paths match apps/web). Talent and their representatives only. */
@Controller('portal')
@Roles('TALENT', 'REP')
export class PortalController {
  constructor(@Inject(PortalService) private readonly svc: PortalService) {}

  @Get()
  async profile(@CurrentUser() u: AuthUserRef) {
    return { data: await this.svc.profile(u) };
  }

  @Get('bookings')
  async bookings(@CurrentUser() u: AuthUserRef) {
    return { data: await this.svc.bookings(u) };
  }

  @Get('payouts')
  async payouts(@CurrentUser() u: AuthUserRef) {
    return { data: await this.svc.payouts(u) };
  }

  @Get('blackouts')
  async blackouts(@CurrentUser() u: AuthUserRef) {
    return { data: await this.svc.blackouts(u) };
  }

  @Put('blackouts/:date')
  async add(@Param('date', new ZodPipe(IsoDateSchema)) date: string, @Body(new ZodPipe(BlackoutBody)) b: z.infer<typeof BlackoutBody>, @CurrentUser() u: AuthUserRef, @Req() req: Request) {
    return { data: await this.svc.setBlackout(date, true, b.reason, u, req.ip) };
  }

  @Delete('blackouts/:date')
  async remove(@Param('date', new ZodPipe(IsoDateSchema)) date: string, @CurrentUser() u: AuthUserRef, @Req() req: Request) {
    return { data: await this.svc.setBlackout(date, false, null, u, req.ip) };
  }
}
