import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { DomainError, ForbiddenError } from '../common/errors';
import { ENV, type Env } from '../config/env';
import { PrismaService } from '../prisma/prisma.service';
import { SMS_SENDER, type SmsSender } from './sms';

export const OTP_TTL_SECONDS = 5 * 60;
export const OTP_RESEND_SECONDS = 30;
export const OTP_MAX_ATTEMPTS = 5;
/** trd §10: OTP send 3 / 10 min per phone and per IP. */
export const OTP_SEND_LIMIT = 3;
export const OTP_SEND_WINDOW_SECONDS = 10 * 60;

class RateLimitedError extends DomainError {
  constructor(retryAfterSeconds: number) {
    super('RATE_LIMITED', `Too many codes requested. Try again in ${Math.ceil(retryAfterSeconds / 60)} min.`, 429, { retryAfterSeconds });
  }
}
const invalid = () => new DomainError('OTP_INVALID', 'That code is incorrect or has expired.', 400);

/** E.164 for storage: IndianMobileSchema hands us 10 digits. */
export const toE164 = (tenDigits: string) => `+91${tenDigits}`;

/**
 * Phone OTP sign-in (AUTH-1, AUTH-4). Codes are 6 random digits, valid 5 minutes, 5 guesses max;
 * only an HMAC is stored. Verifying creates the customer account on first sign-in.
 */
@Injectable()
export class OtpService {
  constructor(
    @Inject(ENV) private readonly env: Env,
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(SMS_SENDER) private readonly sms: SmsSender,
  ) {}

  private hash(phone: string, code: string) {
    return createHmac('sha256', this.env.AUTH_SECRET).update(`${phone}:${code}`).digest();
  }

  async send(phone: string, ip: string | undefined) {
    const now = Date.now();
    const windowStart = new Date(now - OTP_SEND_WINDOW_SECONDS * 1000);

    const recent = await this.prisma.otpChallenge.findMany({
      where: { createdAt: { gte: windowStart }, OR: [{ phone }, ...(ip ? [{ ip }] : [])] },
      orderBy: { createdAt: 'asc' },
      select: { phone: true, ip: true, createdAt: true },
    });
    const byPhone = recent.filter((r) => r.phone === phone);
    const byIp = ip ? recent.filter((r) => r.ip === ip) : [];

    const latest = byPhone.at(-1);
    if (latest && now - latest.createdAt.getTime() < OTP_RESEND_SECONDS * 1000) {
      throw new RateLimitedError(OTP_RESEND_SECONDS - Math.floor((now - latest.createdAt.getTime()) / 1000));
    }
    for (const list of [byPhone, byIp]) {
      if (list.length >= OTP_SEND_LIMIT) {
        const oldest = list[list.length - OTP_SEND_LIMIT]!;
        throw new RateLimitedError(Math.max(1, Math.ceil((oldest.createdAt.getTime() + OTP_SEND_WINDOW_SECONDS * 1000 - now) / 1000)));
      }
    }

    const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
    await this.prisma.otpChallenge.create({
      data: { phone, ip, codeHash: this.hash(phone, code).toString('hex'), expiresAt: new Date(now + OTP_TTL_SECONDS * 1000) },
    });
    await this.sms.sendOtp(phone, code);
    return { expiresInSeconds: OTP_TTL_SECONDS, resendInSeconds: OTP_RESEND_SECONDS };
  }

  /** Check and consume the latest code for this phone (no account changes). */
  async checkCode(phone: string, code: string) {
    const challenge = await this.prisma.otpChallenge.findFirst({
      where: { phone, consumedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });
    if (!challenge) throw invalid();
    if (challenge.attempts >= OTP_MAX_ATTEMPTS) throw new DomainError('OTP_TOO_MANY_ATTEMPTS', 'Too many wrong codes. Request a new one.', 429);

    // DEMO ONLY: OTP_ACCEPT_ANY lets any 6-digit code through (env refuses it in production).
    const demo = this.env.OTP_ACCEPT_ANY && /^\d{6}$/.test(code);
    const expected = Buffer.from(challenge.codeHash, 'hex');
    const given = this.hash(phone, code);
    if (!demo && (expected.length !== given.length || !timingSafeEqual(expected, given))) {
      await this.prisma.otpChallenge.update({ where: { id: challenge.id }, data: { attempts: { increment: 1 } } });
      throw invalid();
    }

    // Single use, even under concurrent verifies.
    const { count } = await this.prisma.otpChallenge.updateMany({ where: { id: challenge.id, consumedAt: null }, data: { consumedAt: new Date() } });
    if (count !== 1) throw invalid();
  }

  /** Check the code; on success return the (possibly new) customer user. */
  async verify(phone: string, code: string, name?: string) {
    await this.checkCode(phone, code);
    const existing = await this.prisma.user.findUnique({ where: { phone } });
    if (existing?.deletedAt) throw new ForbiddenError('This account has been closed. Contact support to restore it.');
    if (existing) {
      if (!existing.name && name) return this.prisma.user.update({ where: { id: existing.id }, data: { name } });
      return existing;
    }
    return this.prisma.user.create({ data: { phone, name: name ?? null, roles: ['CUSTOMER'] } });
  }
}
