import { type CallHandler, type ExecutionContext, Inject, Injectable, Logger, type NestInterceptor } from '@nestjs/common';
import { type Observable, catchError, tap, throwError } from 'rxjs';
import type { AuthedRequest } from '../auth/guards';
import { AuditService } from './audit.service';

const MUTATIONS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * T-126: records every mutating /admin request (actor, route, params, outcome). Services add
 * richer before/after entries for sensitive changes. Audit failures never break the request.
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly log = new Logger('Audit');

  constructor(@Inject(AuditService) private readonly audit: AuditService) {}

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = ctx.switchToHttp().getRequest<AuthedRequest>();
    const path = (req.route?.path as string | undefined) ?? req.path;
    if (!MUTATIONS.has(req.method) || !path.includes('/admin/')) return next.handle();

    const write = (outcome: 'ok' | 'error', status?: number) =>
      this.audit
        .record({
          actorId: req.user?.id,
          action: `${req.method} ${path}`,
          entity: path.split('/').filter(Boolean)[2] ?? 'admin',
          entityId: String(req.params?.id ?? '-'),
          after: { outcome, status, params: req.params },
          ip: req.ip,
        })
        .catch((err: unknown) => this.log.error({ err }, 'Audit write failed'));

    return next.handle().pipe(
      tap(() => void write('ok', ctx.switchToHttp().getResponse<{ statusCode: number }>().statusCode)),
      catchError((err: unknown) => {
        void write('error', (err as { status?: number }).status);
        return throwError(() => err);
      }),
    );
  }
}
