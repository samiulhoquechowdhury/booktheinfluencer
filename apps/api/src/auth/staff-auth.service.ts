import { Inject, Injectable } from '@nestjs/common';
import { verifyPassword } from '@repo/db';
import { STAFF_ROLES, type StaffLoginResult } from '@repo/schemas';
import { DomainError } from '../common/errors';
import { ENV, type Env } from '../config/env';
import { PrismaService } from '../prisma/prisma.service';
import { SecretBox } from './secret-box';
import { MFA_TTL_SECONDS, TokensService, UnauthenticatedError } from './tokens.service';
import { generateTotpSecret, otpauthUrl, verifyTotp } from './totp';

/** trd §10: login 10 / 15 min (per email and per IP). */
export const LOGIN_LIMIT = 10;
export const LOGIN_WINDOW_SECONDS = 15 * 60;

const badCredentials = () => new UnauthenticatedError('INVALID_CREDENTIALS', 'Email or password is incorrect.');
const isStaff = (roles: readonly string[]) => roles.some((r) => (STAFF_ROLES as readonly string[]).includes(r));

/**
 * Staff sign-in (AUTH-2): email + password, then a mandatory TOTP code (trd §10). First sign-in
 * returns an authenticator setup; the secret is only marked enabled once a code from it verifies.
 */
@Injectable()
export class StaffAuthService {
  private readonly box: SecretBox;

  constructor(
    @Inject(ENV) env: Env,
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(TokensService) private readonly tokens: TokensService,
  ) {
    this.box = new SecretBox(env.MFA_ENCRYPTION_KEY);
  }

  private async assertNotRateLimited(email: string, ip: string | undefined) {
    const since = new Date(Date.now() - LOGIN_WINDOW_SECONDS * 1000);
    const [byEmail, byIp] = await Promise.all([
      this.prisma.loginAttempt.count({ where: { email, success: false, createdAt: { gte: since } } }),
      ip ? this.prisma.loginAttempt.count({ where: { ip, success: false, createdAt: { gte: since } } }) : 0,
    ]);
    if (byEmail >= LOGIN_LIMIT || byIp >= LOGIN_LIMIT) {
      throw new DomainError('RATE_LIMITED', 'Too many sign-in attempts. Try again in 15 minutes.', 429, { retryAfterSeconds: LOGIN_WINDOW_SECONDS });
    }
  }

  async login(email: string, password: string, ip: string | undefined): Promise<StaffLoginResult> {
    await this.assertNotRateLimited(email, ip);
    const user = await this.prisma.user.findUnique({ where: { email } });
    // Always run the hash check so timing doesn't reveal which emails exist.
    const ok = await verifyPassword(password, user?.passwordHash ?? 'scrypt$32768$8$1$AAAAAAAAAAAAAAAAAAAAAA==$AAAA');
    const allowed = ok && user && !user.deletedAt && isStaff(user.roles);
    await this.prisma.loginAttempt.create({ data: { email, ip, success: Boolean(allowed) } });
    if (!allowed) throw badCredentials();

    let setup: StaffLoginResult['setup'] = null;
    if (!user.mfaEnabledAt) {
      // (Re)issue an enrolment secret until the first code is verified.
      const secret = generateTotpSecret();
      await this.prisma.user.update({ where: { id: user.id }, data: { mfaSecret: this.box.seal(secret), mfaLastStep: null } });
      setup = { secret, otpauthUrl: otpauthUrl(secret, email) };
    }
    return { mfaToken: await this.tokens.signMfa(user.id), mfaExpiresInSeconds: MFA_TTL_SECONDS, setup };
  }

  /** Step 2: returns the user once the code checks out (and finishes enrolment if pending). */
  async verifyMfa(mfaToken: string, code: string, ip: string | undefined) {
    const userId = await this.tokens.verifyMfa(mfaToken);
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.deletedAt || !user.mfaSecret || !isStaff(user.roles)) throw new UnauthenticatedError('MFA_TOKEN_INVALID', 'Enter your email and password again.');
    if (user.email) await this.assertNotRateLimited(user.email, ip);

    const step = verifyTotp(this.box.open(user.mfaSecret), code, user.mfaLastStep);
    if (step == null) {
      if (user.email) await this.prisma.loginAttempt.create({ data: { email: user.email, ip, success: false } });
      throw new DomainError('MFA_INVALID', 'That code is incorrect. Check the time on your phone and try again.', 400);
    }
    // Record the step atomically so the same code can't be used twice.
    const { count } = await this.prisma.user.updateMany({
      where: { id: user.id, OR: [{ mfaLastStep: null }, { mfaLastStep: { lt: step } }] },
      data: { mfaLastStep: step, mfaEnabledAt: user.mfaEnabledAt ?? new Date() },
    });
    if (count !== 1) throw new DomainError('MFA_INVALID', 'That code was already used. Wait for the next one.', 400);
    return user;
  }
}
