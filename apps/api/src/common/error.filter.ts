import { type ArgumentsHost, Catch, type ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import type { Request, Response } from 'express';
import { ZodError } from 'zod';
import { StageTransitionError } from '@repo/utils';
import { DomainError } from './errors';

type ErrorBody = { error: { code: string; message: string; details?: unknown; requestId?: string } };

/** Turns every thrown value into the API error shape (trd §3 conventions). */
@Catch()
export class GlobalErrorFilter implements ExceptionFilter {
  private readonly log = new Logger('Errors');

  catch(exception: unknown, host: ArgumentsHost) {
    const http = host.switchToHttp();
    const req = http.getRequest<Request & { id?: string }>();
    const res = http.getResponse<Response>();
    const { status, body } = this.toResponse(exception);
    body.error.requestId = typeof req.id === 'string' ? req.id : undefined;
    if (status >= 500) this.log.error({ err: exception, requestId: body.error.requestId }, 'Unhandled error');
    res.status(status).json(body);
  }

  private toResponse(e: unknown): { status: number; body: ErrorBody } {
    if (e instanceof StageTransitionError) return { status: HttpStatus.CONFLICT, body: { error: { code: e.code, message: e.message } } };
    if (e instanceof DomainError) return { status: e.status, body: { error: { code: e.code, message: e.message, details: e.details } } };
    if (e instanceof ZodError)
      return {
        status: HttpStatus.BAD_REQUEST,
        body: { error: { code: 'VALIDATION_FAILED', message: 'Some fields are missing or invalid.', details: e.issues.map((i) => ({ path: i.path.join('.'), message: i.message })) } },
      };
    if (e instanceof HttpException) {
      const status = e.getStatus();
      const code = HttpStatus[status] ?? 'HTTP_ERROR';
      return { status, body: { error: { code, message: e.message } } };
    }
    return { status: HttpStatus.INTERNAL_SERVER_ERROR, body: { error: { code: 'INTERNAL', message: 'Something went wrong on our side. Please try again.' } } };
  }
}
