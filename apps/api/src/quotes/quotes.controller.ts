import { Body, Controller, Get, HttpCode, Inject, Param, Post, Put, Req } from '@nestjs/common';
import type { Request } from 'express';
import { QuoteApprovalSchema, QuoteDecisionSchema, QuoteInputSchema, type QuoteDecision, type QuoteInput } from '@repo/schemas';
import type { z } from 'zod';
import { CurrentUser, Roles } from '../auth/decorators';
import type { AuthUserRef } from '../auth/guards';
import { ZodPipe } from '../common/zod.pipe';
import { CustomerBookingsService } from './customer-bookings.service';
import { QuotesService } from './quotes.service';

/** Staff read quotes; sales, talent managers and finance build them; only SUPER_ADMIN approves (QUO-6). */
const Build = () => Roles('SALES', 'TALENT_MANAGER', 'ACCOUNTS');

@Controller('admin')
@Roles('SALES', 'TALENT_MANAGER', 'OPS', 'ACCOUNTS')
export class AdminQuotesController {
  constructor(@Inject(QuotesService) private readonly svc: QuotesService) {}

  @Get('bookings/:id/quotes')
  async list(@Param('id') id: string, @CurrentUser() u: AuthUserRef) {
    return { data: await this.svc.forBooking(id, u) };
  }

  @Post('bookings/:id/quotes')
  @Build()
  async create(@Param('id') id: string, @Body(new ZodPipe(QuoteInputSchema)) b: QuoteInput, @CurrentUser() u: AuthUserRef, @Req() req: Request) {
    return { data: await this.svc.create(id, b, u, req.ip) };
  }

  @Get('quotes/:id')
  async get(@Param('id') id: string, @CurrentUser() u: AuthUserRef) {
    return { data: await this.svc.get(id, u) };
  }

  @Put('quotes/:id')
  @Build()
  async update(@Param('id') id: string, @Body(new ZodPipe(QuoteInputSchema)) b: QuoteInput, @CurrentUser() u: AuthUserRef, @Req() req: Request) {
    return { data: await this.svc.update(id, b, u, req.ip) };
  }

  @Post('quotes/:id/send')
  @Build()
  @HttpCode(200)
  async send(@Param('id') id: string, @CurrentUser() u: AuthUserRef, @Req() req: Request) {
    return { data: await this.svc.send(id, u, req.ip) };
  }

  @Post('quotes/:id/approve')
  @Roles('SUPER_ADMIN')
  @HttpCode(200)
  async approve(@Param('id') id: string, @Body(new ZodPipe(QuoteApprovalSchema)) b: z.infer<typeof QuoteApprovalSchema>, @CurrentUser() u: AuthUserRef, @Req() req: Request) {
    return { data: await this.svc.approve(id, b.note, u, req.ip) };
  }

  @Post('quotes/:id/return')
  @Roles('SUPER_ADMIN')
  @HttpCode(200)
  async returnToDraft(@Param('id') id: string, @Body(new ZodPipe(QuoteApprovalSchema)) b: z.infer<typeof QuoteApprovalSchema>, @CurrentUser() u: AuthUserRef, @Req() req: Request) {
    return { data: await this.svc.returnToDraft(id, b.note, u, req.ip) };
  }
}

/** The signed-in customer's bookings (CUS-2) and quote decisions (QUO-7). Paths match apps/web. */
@Controller('me/bookings')
@Roles('CUSTOMER')
export class CustomerBookingsController {
  constructor(@Inject(CustomerBookingsService) private readonly svc: CustomerBookingsService) {}

  @Get()
  async dashboard(@CurrentUser() u: AuthUserRef) {
    return { data: await this.svc.dashboard(u) };
  }

  @Get(':ref')
  async byRef(@Param('ref') ref: string, @CurrentUser() u: AuthUserRef) {
    return { data: await this.svc.byRef(ref, u) };
  }

  @Post(':ref/quotes/:quoteId/decision')
  @HttpCode(200)
  async decide(@Param('ref') ref: string, @Param('quoteId') quoteId: string, @Body(new ZodPipe(QuoteDecisionSchema)) d: QuoteDecision, @CurrentUser() u: AuthUserRef, @Req() req: Request) {
    return { data: await this.svc.decide(ref, quoteId, d, u, req.ip) };
  }
}
