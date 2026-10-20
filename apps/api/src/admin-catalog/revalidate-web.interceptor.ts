import { type CallHandler, type ExecutionContext, Inject, Injectable, Logger, type NestInterceptor } from '@nestjs/common';
import type { Request } from 'express';
import { type Observable, tap } from 'rxjs';
import { ENV, type Env } from '../config/env';

/**
 * trd §13: after a successful catalogue change, ask the website to refresh its cached (ISR) pages so
 * edits show within seconds instead of at the next revalidate. Fire-and-forget: the admin's save never
 * waits on or fails because of the website. Off unless WEB_REVALIDATE_URL and REVALIDATE_SECRET are set.
 */
@Injectable()
export class RevalidateWebInterceptor implements NestInterceptor {
  private readonly log = new Logger('RevalidateWeb');

  constructor(@Inject(ENV) private readonly env: Env) {}

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = ctx.switchToHttp().getRequest<Request>();
    if (req.method === 'GET' || !this.env.WEB_REVALIDATE_URL || !this.env.REVALIDATE_SECRET) return next.handle();
    return next.handle().pipe(tap(() => void this.ping()));
  }

  private async ping() {
    try {
      const res = await fetch(this.env.WEB_REVALIDATE_URL!, { method: 'POST', headers: { 'x-revalidate-secret': this.env.REVALIDATE_SECRET! }, signal: AbortSignal.timeout(5000) });
      if (!res.ok) this.log.warn(`Website revalidation returned ${res.status}`);
    } catch (err) {
      this.log.warn({ err }, 'Website revalidation failed');
    }
  }
}
