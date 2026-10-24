import { Body, Controller, Delete, Get, HttpCode, Inject, Param, Post, Put, Req } from '@nestjs/common';
import type { Request } from 'express';
import { OnboardingPhotoUploadSchema, OnboardingProfileSchema, type OnboardingPhotoUpload, type OnboardingProfile } from '@repo/schemas';
import { CurrentUser, Roles } from '../auth/decorators';
import type { AuthUserRef } from '../auth/guards';
import { ZodPipe } from '../common/zod.pipe';
import { OnboardingService } from './onboarding.service';

/** Talent self-onboarding: fill in your profile, add photos, submit for staff review. */
@Controller('portal/onboarding')
@Roles('TALENT', 'REP')
export class OnboardingController {
  constructor(@Inject(OnboardingService) private readonly svc: OnboardingService) {}

  @Get()
  async get(@CurrentUser() u: AuthUserRef) {
    return { data: await this.svc.get(u) };
  }

  @Put()
  async save(@Body(new ZodPipe(OnboardingProfileSchema)) b: OnboardingProfile, @CurrentUser() u: AuthUserRef, @Req() req: Request) {
    return { data: await this.svc.save(u, b, req.ip) };
  }

  @Post('photos')
  async addPhoto(@Body(new ZodPipe(OnboardingPhotoUploadSchema)) b: OnboardingPhotoUpload, @CurrentUser() u: AuthUserRef, @Req() req: Request) {
    return { data: await this.svc.addPhoto(u, b, req.ip) };
  }

  @Delete('photos/:id')
  async removePhoto(@Param('id') id: string, @CurrentUser() u: AuthUserRef, @Req() req: Request) {
    return { data: await this.svc.removePhoto(u, id, req.ip) };
  }

  @Put('photos/:id/cover')
  async cover(@Param('id') id: string, @CurrentUser() u: AuthUserRef) {
    return { data: await this.svc.coverPhoto(u, id) };
  }

  @Post('submit')
  @HttpCode(200)
  async submit(@CurrentUser() u: AuthUserRef, @Req() req: Request) {
    return { data: await this.svc.submit(u, req.ip) };
  }
}
