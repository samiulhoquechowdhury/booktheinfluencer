import { Body, Controller, HttpCode, Inject, Post, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { EnquirySchema, type Enquiry } from '@repo/schemas';
import { sessionResponse } from '../auth/auth.controller';
import { Public } from '../auth/decorators';
import { TokensService } from '../auth/tokens.service';
import { ZodPipe } from '../common/zod.pipe';
import { ENV, type Env } from '../config/env';
import { EnquiriesService } from './enquiries.service';

/** T-160: the website's brief form. The OTP in the body proves the phone, so the customer is also signed in. */
@Public()
@Controller('enquiries')
export class EnquiriesController {
  constructor(
    @Inject(ENV) private readonly env: Env,
    @Inject(EnquiriesService) private readonly svc: EnquiriesService,
    @Inject(TokensService) private readonly tokens: TokensService,
  ) {}

  @Post()
  @HttpCode(201)
  async submit(@Body(new ZodPipe(EnquirySchema)) body: Enquiry, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const { customer, ref, bookingRefs, expectedResponseHours } = await this.svc.submit(body, req.ip);
    const session = await sessionResponse(res, this.env, this.tokens, customer, await this.tokens.issueRefresh(customer.id));
    return { data: { ref, bookingRefs, expectedResponseHours, session: session.data } };
  }
}
