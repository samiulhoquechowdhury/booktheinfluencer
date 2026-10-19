import { Body, Controller, Delete, Get, HttpCode, Inject, Param, Patch, Post, Put, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import {
  AdminTalentQuerySchema,
  BlackoutInputSchema,
  CategoryInputSchema,
  CategoryUpdateSchema,
  MediaInputSchema,
  MediaOrderSchema,
  RateCardInputSchema,
  RepInputSchema,
  RepUpdateSchema,
  RepVerificationSchema,
  TalentInputSchema,
  TalentStatusSchema,
  TalentUpdateSchema,
  type AdminTalentQuery,
  type TalentInput,
  type TalentUpdate,
} from '@repo/schemas';
import type { z } from 'zod';
import { CurrentUser, Roles } from '../auth/decorators';
import type { AuthUserRef } from '../auth/guards';
import { ZodPipe } from '../common/zod.pipe';
import { AdminCatalogService } from './admin-catalog.service';

/** trd §7: all staff may read the catalogue incl. rate cards; talent managers (and super admins) edit. */
const STAFF_READ = ['SALES', 'TALENT_MANAGER', 'OPS', 'ACCOUNTS'] as const;
const Edit = () => Roles('TALENT_MANAGER');

@Controller('admin')
@Roles(...STAFF_READ)
export class AdminCatalogController {
  constructor(@Inject(AdminCatalogService) private readonly svc: AdminCatalogService) {}

  // Categories (T-140)
  @Get('categories')
  async categories() {
    return { data: await this.svc.listCategories() };
  }

  @Post('categories')
  @Edit()
  async createCategory(@Body(new ZodPipe(CategoryInputSchema)) b: z.infer<typeof CategoryInputSchema>, @CurrentUser() u: AuthUserRef, @Req() req: Request) {
    return { data: await this.svc.createCategory(b, u, req.ip) };
  }

  @Patch('categories/:id')
  @Edit()
  async updateCategory(@Param('id') id: string, @Body(new ZodPipe(CategoryUpdateSchema)) b: z.infer<typeof CategoryUpdateSchema>, @CurrentUser() u: AuthUserRef, @Req() req: Request) {
    return { data: await this.svc.updateCategory(id, b, u, req.ip) };
  }

  @Delete('categories/:id')
  @Edit()
  @HttpCode(204)
  async deleteCategory(@Param('id') id: string, @CurrentUser() u: AuthUserRef, @Req() req: Request) {
    await this.svc.deleteCategory(id, u, req.ip);
  }

  // Talent (T-141)
  @Get('talents')
  talents(@Query(new ZodPipe(AdminTalentQuerySchema)) q: AdminTalentQuery) {
    return this.svc.listTalents(q);
  }

  @Get('talents/:id')
  async talent(@Param('id') id: string) {
    return { data: await this.svc.getTalent(id) };
  }

  @Post('talents')
  @Edit()
  async createTalent(@Body(new ZodPipe(TalentInputSchema)) b: TalentInput, @CurrentUser() u: AuthUserRef, @Req() req: Request) {
    return { data: await this.svc.createTalent(b, u, req.ip) };
  }

  @Patch('talents/:id')
  @Edit()
  async updateTalent(@Param('id') id: string, @Body(new ZodPipe(TalentUpdateSchema)) b: TalentUpdate, @CurrentUser() u: AuthUserRef, @Req() req: Request) {
    return { data: await this.svc.updateTalent(id, b, u, req.ip) };
  }

  @Put('talents/:id/status')
  @Edit()
  async status(@Param('id') id: string, @Body(new ZodPipe(TalentStatusSchema)) b: z.infer<typeof TalentStatusSchema>, @CurrentUser() u: AuthUserRef, @Req() req: Request) {
    return { data: await this.svc.setStatus(id, b.status, u, req.ip) };
  }

  // Media (T-142)
  @Post('talents/:id/media')
  @Edit()
  async addMedia(@Param('id') id: string, @Body(new ZodPipe(MediaInputSchema)) b: z.infer<typeof MediaInputSchema>, @CurrentUser() u: AuthUserRef, @Req() req: Request) {
    return { data: await this.svc.addMedia(id, b, u, req.ip) };
  }

  @Put('talents/:id/media/order')
  @Edit()
  async orderMedia(@Param('id') id: string, @Body(new ZodPipe(MediaOrderSchema)) b: z.infer<typeof MediaOrderSchema>, @CurrentUser() u: AuthUserRef, @Req() req: Request) {
    return { data: await this.svc.orderMedia(id, b.ids, u, req.ip) };
  }

  @Delete('talents/:id/media/:mediaId')
  @Edit()
  @HttpCode(204)
  async removeMedia(@Param('id') id: string, @Param('mediaId') mediaId: string, @CurrentUser() u: AuthUserRef, @Req() req: Request) {
    await this.svc.removeMedia(id, mediaId, u, req.ip);
  }

  // Rate cards (T-143, INTERNAL)
  @Get('talents/:id/rate-cards')
  async rateCards(@Param('id') id: string) {
    return { data: await this.svc.listRateCards(id) };
  }

  @Post('talents/:id/rate-cards')
  @Edit()
  async createRateCard(@Param('id') id: string, @Body(new ZodPipe(RateCardInputSchema)) b: z.infer<typeof RateCardInputSchema>, @CurrentUser() u: AuthUserRef, @Req() req: Request) {
    return { data: await this.svc.upsertRateCard(id, b, u, req.ip) };
  }

  @Put('talents/:id/rate-cards/:cardId')
  @Edit()
  async updateRateCard(@Param('id') id: string, @Param('cardId') cardId: string, @Body(new ZodPipe(RateCardInputSchema)) b: z.infer<typeof RateCardInputSchema>, @CurrentUser() u: AuthUserRef, @Req() req: Request) {
    return { data: await this.svc.upsertRateCard(id, b, u, req.ip, cardId) };
  }

  @Delete('talents/:id/rate-cards/:cardId')
  @Edit()
  @HttpCode(204)
  async deleteRateCard(@Param('id') id: string, @Param('cardId') cardId: string, @CurrentUser() u: AuthUserRef, @Req() req: Request) {
    await this.svc.deleteRateCard(id, cardId, u, req.ip);
  }

  // Representatives (T-144)
  @Get('reps')
  async reps() {
    return { data: await this.svc.listReps() };
  }

  @Post('reps')
  @Edit()
  async createRep(@Body(new ZodPipe(RepInputSchema)) b: z.infer<typeof RepInputSchema>, @CurrentUser() u: AuthUserRef, @Req() req: Request) {
    return { data: await this.svc.createRep(b, u, req.ip) };
  }

  @Patch('reps/:id')
  @Edit()
  async updateRep(@Param('id') id: string, @Body(new ZodPipe(RepUpdateSchema)) b: z.infer<typeof RepUpdateSchema>, @CurrentUser() u: AuthUserRef, @Req() req: Request) {
    return { data: await this.svc.updateRep(id, b, u, req.ip) };
  }

  @Put('reps/:id/verification')
  @Edit()
  async verifyRep(@Param('id') id: string, @Body(new ZodPipe(RepVerificationSchema)) b: z.infer<typeof RepVerificationSchema>, @CurrentUser() u: AuthUserRef, @Req() req: Request) {
    return { data: await this.svc.setRepVerification(id, b, u, req.ip) };
  }

  @Put('talents/:id/reps/:repId')
  @Edit()
  @HttpCode(204)
  async linkRep(@Param('id') id: string, @Param('repId') repId: string, @CurrentUser() u: AuthUserRef, @Req() req: Request) {
    await this.svc.linkRep(id, repId, true, u, req.ip);
  }

  @Delete('talents/:id/reps/:repId')
  @Edit()
  @HttpCode(204)
  async unlinkRep(@Param('id') id: string, @Param('repId') repId: string, @CurrentUser() u: AuthUserRef, @Req() req: Request) {
    await this.svc.linkRep(id, repId, false, u, req.ip);
  }

  // Blackouts (T-145)
  @Get('talents/:id/blackouts')
  async blackouts(@Param('id') id: string) {
    return { data: await this.svc.listBlackouts(id) };
  }

  @Post('talents/:id/blackouts')
  @Edit()
  async addBlackout(@Param('id') id: string, @Body(new ZodPipe(BlackoutInputSchema)) b: z.infer<typeof BlackoutInputSchema>, @CurrentUser() u: AuthUserRef, @Req() req: Request) {
    return { data: await this.svc.addBlackout(id, b, u, req.ip) };
  }

  @Delete('talents/:id/blackouts/:blackoutId')
  @Edit()
  @HttpCode(204)
  async removeBlackout(@Param('id') id: string, @Param('blackoutId') blackoutId: string, @CurrentUser() u: AuthUserRef, @Req() req: Request) {
    await this.svc.removeBlackout(id, blackoutId, u, req.ip);
  }
}
