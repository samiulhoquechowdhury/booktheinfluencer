import { Body, Controller, Get, Headers, HttpCode, Inject, Param, Post, Query, Req, type RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import { ContractSendSchema, ContractVoidSchema, ManualPaymentSchema, MilestoneQuerySchema, type ManualPayment, type MilestoneQuery } from '@repo/schemas';
import type { z } from 'zod';
import { CurrentUser, Public, Roles } from '../auth/decorators';
import type { AuthUserRef } from '../auth/guards';
import { ZodPipe } from '../common/zod.pipe';
import { ContractsService } from '../contracts/contracts.service';
import { PaymentsService } from './payments.service';

type Hdrs = Record<string, string | string[] | undefined>;

/** Staff: payments are read by sales/ops/finance; only ACCOUNTS records them (PAY-4). Contracts: sales/ops. */
@Controller('admin')
@Roles('SALES', 'OPS', 'ACCOUNTS', 'TALENT_MANAGER')
export class AdminPaymentsController {
  constructor(
    @Inject(PaymentsService) private readonly payments: PaymentsService,
    @Inject(ContractsService) private readonly contracts: ContractsService,
  ) {}

  @Get('bookings/:id/payments')
  async list(@Param('id') id: string) {
    return { data: await this.payments.forBooking(id) };
  }

  @Get('milestones')
  async milestones(@Query(new ZodPipe(MilestoneQuerySchema)) q: MilestoneQuery) {
    return this.payments.listMilestones(q);
  }

  @Post('milestones/:id/payments')
  @Roles('ACCOUNTS')
  async manual(@Param('id') id: string, @Body(new ZodPipe(ManualPaymentSchema)) b: ManualPayment, @CurrentUser() u: AuthUserRef, @Req() req: Request) {
    return { data: await this.payments.recordManual(id, b, u, req.ip) };
  }

  @Get('bookings/:id/contracts')
  async contractsFor(@Param('id') id: string) {
    return { data: await this.contracts.forBooking(id) };
  }

  @Post('bookings/:id/contract')
  @Roles('SALES', 'OPS')
  async sendContract(@Param('id') id: string, @Body(new ZodPipe(ContractSendSchema)) b: z.infer<typeof ContractSendSchema>, @CurrentUser() u: AuthUserRef, @Req() req: Request) {
    return { data: await this.contracts.send(id, b.includeRep, u, req.ip) };
  }

  @Post('contracts/:id/void')
  @Roles('SALES', 'OPS')
  @HttpCode(200)
  async voidContract(@Param('id') id: string, @Body(new ZodPipe(ContractVoidSchema)) b: z.infer<typeof ContractVoidSchema>, @CurrentUser() u: AuthUserRef, @Req() req: Request) {
    return { data: await this.contracts.void(id, b.reason, u, req.ip) };
  }
}

/** The customer's pay button (path matches apps/web). Returns a hosted link only. */
@Controller('me/bookings')
@Roles('CUSTOMER')
export class CustomerPaymentsController {
  constructor(@Inject(PaymentsService) private readonly payments: PaymentsService) {}

  @Post(':ref/milestones/:id/pay')
  @HttpCode(200)
  async pay(@Param('ref') ref: string, @Param('id') id: string, @CurrentUser() u: AuthUserRef) {
    return { data: await this.payments.payIntent(ref, id, u) };
  }
}

/** Provider callbacks. Public, but every request must carry a valid HMAC of the raw body. */
@Public()
@Controller('webhooks')
export class WebhooksController {
  constructor(
    @Inject(PaymentsService) private readonly payments: PaymentsService,
    @Inject(ContractsService) private readonly contracts: ContractsService,
  ) {}

  @Post('payments')
  @HttpCode(200)
  async payment(@Req() req: RawBodyRequest<Request>, @Headers() h: Hdrs, @Body() body: unknown) {
    return { data: await this.payments.webhook(req.rawBody, h, body) };
  }

  @Post('esign')
  @HttpCode(200)
  async esign(@Req() req: RawBodyRequest<Request>, @Headers() h: Hdrs, @Body() body: unknown) {
    return { data: await this.contracts.webhook(req.rawBody, h, body) };
  }
}
