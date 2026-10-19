import { Body, Controller, HttpCode, Inject, Post, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { MfaVerifySchema, OtpRequestSchema, OtpVerifySchema, StaffLoginSchema, type AuthTokens, type MfaVerify, type OtpVerify, type StaffLogin } from '@repo/schemas';
import { ZodPipe } from '../common/zod.pipe';
import { ENV, type Env } from '../config/env';
import { Public } from './decorators';
import { OtpService, toE164 } from './otp.service';
import { StaffAuthService } from './staff-auth.service';
import { ACCESS_TTL_SECONDS, REFRESH_TTL_DAYS, TokensService, UnauthenticatedError } from './tokens.service';
import { toAuthUser } from './auth-user';

export const REFRESH_COOKIE = 'tp_refresh';
/** The cookie only travels to the auth routes (trd §1: httpOnly, Secure, SameSite=Strict). */
const COOKIE_PATH = '/v1/auth';

const readCookie = (req: Request, name: string) => {
  for (const part of (req.headers.cookie ?? '').split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return decodeURIComponent(v.join('='));
  }
  return undefined;
};

/** Sets the refresh cookie and returns the access token + user (shared by sign-in flows). */
export async function sessionResponse(res: Response, env: Env, tokens: TokensService, user: Parameters<typeof toAuthUser>[0], refresh: string): Promise<{ data: AuthTokens }> {
  res.cookie(REFRESH_COOKIE, refresh, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: COOKIE_PATH,
    maxAge: REFRESH_TTL_DAYS * 86_400_000,
  });
  return { data: { accessToken: await tokens.signAccess(user), expiresInSeconds: ACCESS_TTL_SECONDS, user: toAuthUser(user) } };
}

@Public()
@Controller('auth')
export class AuthController {
  constructor(
    @Inject(ENV) private readonly env: Env,
    @Inject(OtpService) private readonly otp: OtpService,
    @Inject(TokensService) private readonly tokens: TokensService,
    @Inject(StaffAuthService) private readonly staff: StaffAuthService,
  ) {}

  private session(res: Response, user: Parameters<typeof toAuthUser>[0], refresh: string) {
    return sessionResponse(res, this.env, this.tokens, user, refresh);
  }

  /** Step 1: text a code to the phone. */
  @Post('otp/send')
  @HttpCode(202)
  async sendOtp(@Body(new ZodPipe(OtpRequestSchema)) body: { phone: string }, @Req() req: Request) {
    return { data: await this.otp.send(toE164(body.phone), req.ip) };
  }

  /** Step 2: check the code, sign in (creating the account on first use). */
  @Post('otp/verify')
  @HttpCode(200)
  async verifyOtp(@Body(new ZodPipe(OtpVerifySchema)) body: OtpVerify, @Res({ passthrough: true }) res: Response) {
    const user = await this.otp.verify(toE164(body.phone), body.code, body.name);
    return this.session(res, user, await this.tokens.issueRefresh(user.id));
  }

  /** Staff step 1 (AUTH-2): email + password → MFA challenge (and authenticator setup on first sign-in). */
  @Post('login')
  @HttpCode(200)
  async login(@Body(new ZodPipe(StaffLoginSchema)) body: StaffLogin, @Req() req: Request) {
    return { data: await this.staff.login(body.email, body.password, req.ip) };
  }

  /** Staff step 2: authenticator code → session. */
  @Post('mfa/verify')
  @HttpCode(200)
  async verifyMfa(@Body(new ZodPipe(MfaVerifySchema)) body: MfaVerify, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const user = await this.staff.verifyMfa(body.mfaToken, body.code, req.ip);
    return this.session(res, user, await this.tokens.issueRefresh(user.id));
  }

  /** New access token from the refresh cookie; the refresh token rotates every time. */
  @Post('refresh')
  @HttpCode(200)
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token = readCookie(req, REFRESH_COOKIE);
    if (!token) throw new UnauthenticatedError('SESSION_INVALID', 'Your session has ended. Sign in again.');
    try {
      const { user, token: next } = await this.tokens.rotateRefresh(token);
      return await this.session(res, user, next);
    } catch (e) {
      res.clearCookie(REFRESH_COOKIE, { path: COOKIE_PATH });
      throw e;
    }
  }

  /** Revoke this session and clear the cookie. Always succeeds. */
  @Post('logout')
  @HttpCode(204)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token = readCookie(req, REFRESH_COOKIE);
    if (token) await this.tokens.revokeRefresh(token);
    res.clearCookie(REFRESH_COOKIE, { path: COOKIE_PATH });
  }
}
