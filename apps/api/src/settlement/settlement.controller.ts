import { Body, Controller, Get, HttpCode, Inject, Param, Patch, Post, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import { AnalyticsQuerySchema, PayoutAdjustSchema, PayoutPaidSchema, PayoutQuerySchema, PayoutScheduleSchema, type AnalyticsQuery } from '@repo/schemas';
import type { z } from 'zod';
import { CurrentUser, Roles } from '../auth/decorators';
import type { AuthUserRef } from '../auth/guards';
import { ZodPipe } from '../common/zod.pipe';
import { AnalyticsService } from './analytics.service';
import { PayoutsService } from './payouts.service';

/** Payouts: talent managers can see them (trd §7), only ACCOUNTS changes them. */
@Controller('admin/payouts')
@Roles('ACCOUNTS', 'TALENT_MANAGER')
export class AdminPayoutsController {
  constructor(@Inject(PayoutsService) private readonly svc: PayoutsService) {}

  @Get()
  async list(@Query(new ZodPipe(PayoutQuerySchema)) q: z.infer<typeof PayoutQuerySchema>) {
    return this.svc.list(q);
  }

  @Post(':id/schedule')
  @Roles('ACCOUNTS')
  @HttpCode(200)
  async schedule(@Param('id') id: string, @Body(new ZodPipe(PayoutScheduleSchema)) b: z.infer<typeof PayoutScheduleSchema>, @CurrentUser() u: AuthUserRef, @Req() req: Request) {
    return { data: await this.svc.schedule(id, b.scheduledFor, u, req.ip) };
  }

  @Patch(':id')
  @Roles('ACCOUNTS')
  async adjust(@Param('id') id: string, @Body(new ZodPipe(PayoutAdjustSchema)) b: z.infer<typeof PayoutAdjustSchema>, @CurrentUser() u: AuthUserRef, @Req() req: Request) {
    return { data: await this.svc.adjust(id, BigInt(b.amountPaise), b.note, u, req.ip) };
  }

  @Post(':id/paid')
  @Roles('ACCOUNTS')
  @HttpCode(200)
  async paid(@Param('id') id: string, @Body(new ZodPipe(PayoutPaidSchema)) b: z.infer<typeof PayoutPaidSchema>, @CurrentUser() u: AuthUserRef, @Req() req: Request) {
    return { data: await this.svc.markPaid(id, b.reference, b.paidOn, u, req.ip) };
  }
}

/** ANA-1..3: every staff role sees the pipeline numbers; money details are finance-only. */
@Controller('admin/analytics')
@Roles('SALES', 'TALENT_MANAGER', 'OPS', 'ACCOUNTS')
export class AdminAnalyticsController {
  constructor(@Inject(AnalyticsService) private readonly svc: AnalyticsService) {}

  @Get()
  async dashboard(@Query(new ZodPipe(AnalyticsQuerySchema)) q: AnalyticsQuery, @CurrentUser() u: AuthUserRef) {
    return { data: await this.svc.dashboard(q, u) };
  }
}
