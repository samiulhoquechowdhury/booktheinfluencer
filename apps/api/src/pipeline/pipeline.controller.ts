import { Body, Controller, Delete, Get, HttpCode, Inject, Param, Patch, Post, Put, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import {
  AvailabilityUpdateSchema,
  LeadBookingAddSchema,
  LeadBriefUpdateSchema,
  LeadNoteSchema,
  LeadOwnerSchema,
  LeadTransitionSchema,
  OpsChecklistSchema,
  type OpsChecklist,
  PipelineQuerySchema,
  RepAcceptanceSchema,
  type LeadTransition,
  type PipelineQuery,
} from '@repo/schemas';
import type { z } from 'zod';
import { CurrentUser, Roles } from '../auth/decorators';
import type { AuthUserRef } from '../auth/guards';
import { ZodPipe } from '../common/zod.pipe';
import { PipelineService } from './pipeline.service';

/** trd §7: every staff role reads the pipeline; accounts staff don't work leads. */
const Work = () => Roles('SALES', 'TALENT_MANAGER', 'OPS');

@Controller('admin')
@Roles('SALES', 'TALENT_MANAGER', 'OPS', 'ACCOUNTS')
export class PipelineController {
  constructor(@Inject(PipelineService) private readonly svc: PipelineService) {}

  // T-163
  @Get('leads')
  async list(@Query(new ZodPipe(PipelineQuerySchema)) q: PipelineQuery) {
    return this.svc.list(q);
  }

  @Get('pipeline/board')
  async board(@Query(new ZodPipe(PipelineQuerySchema)) q: PipelineQuery) {
    const { page: _p, pageSize: _s, stage: _st, ...filters } = q;
    return { data: await this.svc.board(filters) };
  }

  // T-165
  @Get('leads/:id')
  async workspace(@Param('id') id: string) {
    return { data: await this.svc.workspace(id) };
  }

  // T-164
  @Post('leads/:id/transition')
  @Work()
  @HttpCode(200)
  async transition(@Param('id') id: string, @Body(new ZodPipe(LeadTransitionSchema)) b: LeadTransition, @CurrentUser() u: AuthUserRef, @Req() req: Request) {
    return { data: await this.svc.transition(id, b, u, req.ip) };
  }

  @Patch('leads/:id/brief')
  @Work()
  async brief(@Param('id') id: string, @Body(new ZodPipe(LeadBriefUpdateSchema)) b: z.infer<typeof LeadBriefUpdateSchema>, @CurrentUser() u: AuthUserRef, @Req() req: Request) {
    return { data: await this.svc.updateBrief(id, b, u, req.ip) };
  }

  @Post('leads/:id/notes')
  @Work()
  async note(@Param('id') id: string, @Body(new ZodPipe(LeadNoteSchema)) b: z.infer<typeof LeadNoteSchema>, @CurrentUser() u: AuthUserRef) {
    return { data: await this.svc.addNote(id, b.text, u) };
  }

  @Patch('leads/:id/owner')
  @Roles('SALES')
  async owner(@Param('id') id: string, @Body(new ZodPipe(LeadOwnerSchema)) b: z.infer<typeof LeadOwnerSchema>, @CurrentUser() u: AuthUserRef, @Req() req: Request) {
    return { data: await this.svc.assignOwner(id, b.ownerId, u, req.ip) };
  }

  @Post('leads/:id/bookings')
  @Work()
  async addBooking(@Param('id') id: string, @Body(new ZodPipe(LeadBookingAddSchema)) b: z.infer<typeof LeadBookingAddSchema>, @CurrentUser() u: AuthUserRef, @Req() req: Request) {
    return { data: await this.svc.addBooking(id, b.talentSlug, u, req.ip) };
  }

  @Delete('leads/:id/bookings/:bookingId')
  @Work()
  async removeBooking(@Param('id') id: string, @Param('bookingId') bookingId: string, @CurrentUser() u: AuthUserRef, @Req() req: Request) {
    return { data: await this.svc.removeBooking(id, bookingId, u, req.ip) };
  }

  // T-166
  @Put('bookings/:id/availability')
  @Roles('SALES', 'TALENT_MANAGER')
  async availability(@Param('id') id: string, @Body(new ZodPipe(AvailabilityUpdateSchema)) b: z.infer<typeof AvailabilityUpdateSchema>, @CurrentUser() u: AuthUserRef, @Req() req: Request) {
    return { data: await this.svc.setAvailability(id, b.status, b.note, u, req.ip) };
  }

  @Put('bookings/:id/ops')
  @Roles('OPS', 'SALES', 'TALENT_MANAGER')
  async ops(@Param('id') id: string, @Body(new ZodPipe(OpsChecklistSchema)) b: OpsChecklist, @CurrentUser() u: AuthUserRef, @Req() req: Request) {
    return { data: await this.svc.setOpsChecklist(id, b, u, req.ip) };
  }

  @Post('bookings/:id/rep-acceptance')
  @Roles('SALES', 'TALENT_MANAGER')
  @HttpCode(200)
  async repAcceptance(@Param('id') id: string, @Body(new ZodPipe(RepAcceptanceSchema)) b: z.infer<typeof RepAcceptanceSchema>, @CurrentUser() u: AuthUserRef, @Req() req: Request) {
    return { data: await this.svc.recordRepAcceptance(id, b.note, u, req.ip) };
  }
}
