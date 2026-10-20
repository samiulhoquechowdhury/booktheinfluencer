import { Body, Controller, Delete, Get, HttpCode, Inject, Param, Post, Put, Req } from '@nestjs/common';
import type { Request } from 'express';
import { ContactMessageSchema, type ContactMessage } from '@repo/schemas';
import { CurrentUser, Public, Roles } from '../auth/decorators';
import type { AuthUserRef } from '../auth/guards';
import { toE164 } from '../auth/otp.service';
import { PUBLIC_TALENT_INCLUDE, toPublicTalent } from '../catalog/public-talent';
import { DomainError, NotFoundError } from '../common/errors';
import { ZodPipe } from '../common/zod.pipe';
import { nextContactRef } from '../pipeline/refs';
import { PrismaService } from '../prisma/prisma.service';

/** Customer favourites (paths match apps/web). Only published talent are listed or added. */
@Controller('me/favourites')
@Roles('CUSTOMER')
export class FavouritesController {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  @Get()
  async list(@CurrentUser() u: AuthUserRef) {
    const rows = await this.prisma.favourite.findMany({ where: { userId: u.id, talent: { status: 'PUBLISHED' } }, include: { talent: { include: PUBLIC_TALENT_INCLUDE } }, orderBy: { createdAt: 'desc' } });
    return { data: rows.map((f) => toPublicTalent(f.talent)) };
  }

  @Put(':slug')
  async add(@Param('slug') slug: string, @CurrentUser() u: AuthUserRef) {
    const t = await this.prisma.talent.findFirst({ where: { slug, status: 'PUBLISHED' } });
    if (!t) throw new NotFoundError('Talent', slug);
    await this.prisma.favourite.upsert({ where: { userId_talentId: { userId: u.id, talentId: t.id } }, update: {}, create: { userId: u.id, talentId: t.id } });
    return { data: { slug, favourite: true } };
  }

  @Delete(':slug')
  async remove(@Param('slug') slug: string, @CurrentUser() u: AuthUserRef) {
    await this.prisma.favourite.deleteMany({ where: { userId: u.id, talent: { slug } } });
    return { data: { slug, favourite: false } };
  }
}

const CONTACT_LIMIT = 5;

/** Website contact form. Stored for staff follow-up; the email alert waits for the messaging vendor. */
@Public()
@Controller('contact')
export class ContactController {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  @Post()
  @HttpCode(201)
  async submit(@Body(new ZodPipe(ContactMessageSchema)) b: ContactMessage, @Req() req: Request) {
    if (req.ip && (await this.prisma.contactMessage.count({ where: { createdIp: req.ip, createdAt: { gte: new Date(Date.now() - 3_600_000) } } })) >= CONTACT_LIMIT)
      throw new DomainError('RATE_LIMITED', 'Too many messages from this connection. Try again in an hour, or call us.', 429, { retryAfterSeconds: 3600 });
    const ref = await this.prisma.$transaction(async (tx) => {
      const ref = await nextContactRef(tx);
      await tx.contactMessage.create({ data: { ref, name: b.name, email: b.email.toLowerCase(), phone: b.phone ? toE164(b.phone) : null, topic: b.topic, message: b.message, createdIp: req.ip ?? null } });
      return ref;
    });
    return { data: { ref } };
  }
}
