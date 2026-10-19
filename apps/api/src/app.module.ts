import { randomUUID } from 'node:crypto';
import { type DynamicModule, Global, Module } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { LoggerModule } from 'nestjs-pino';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { GlobalErrorFilter } from './common/error.filter';
import { ENV, type Env } from './config/env';
import { AdminAuditController } from './admin/admin-audit.controller';
import { AdminUsersController } from './admin/admin-users.controller';
import { AuditInterceptor } from './audit/audit.interceptor';
import { AuditService } from './audit/audit.service';
import { AuthModule } from './auth/auth.module';
import { CatalogController } from './catalog/catalog.controller';
import { CatalogService } from './catalog/catalog.service';
import { AdminInvitesController, InvitesController } from './invites/invites.controller';
import { InvitesService } from './invites/invites.service';
import { HealthController } from './health/health.controller';
import { PrismaModule } from './prisma/prisma.module';
import { UsersController } from './users/users.controller';

/** Accept a caller's request id if it looks sane; otherwise mint one. Echoed in `x-request-id`. */
function requestId(req: IncomingMessage, res: ServerResponse) {
  const incoming = req.headers['x-request-id'];
  const id = typeof incoming === 'string' && /^[\w-]{8,128}$/.test(incoming) ? incoming : randomUUID();
  res.setHeader('x-request-id', id);
  return id;
}

@Global()
@Module({})
class ConfigModule {
  static forRoot(env: Env): DynamicModule {
    return { module: ConfigModule, providers: [{ provide: ENV, useValue: env }], exports: [ENV] };
  }
}

@Module({})
export class AppModule {
  static forRoot(env: Env): DynamicModule {
    return {
      module: AppModule,
      imports: [
        ConfigModule.forRoot(env),
        LoggerModule.forRoot({
          pinoHttp: {
            level: env.LOG_LEVEL,
            genReqId: requestId,
            transport: env.NODE_ENV === 'development' ? { target: 'pino-pretty', options: { singleLine: true } } : undefined,
            // Never log secrets or personal data (trd §10).
            redact: ['req.headers.authorization', 'req.headers.cookie', 'res.headers["set-cookie"]'],
            customProps: () => ({ service: 'api' }),
          },
        }),
        PrismaModule,
        AuthModule,
      ],
      controllers: [HealthController, CatalogController, UsersController, InvitesController, AdminInvitesController, AdminUsersController, AdminAuditController],
      providers: [
        { provide: APP_FILTER, useClass: GlobalErrorFilter },
        { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
        AuditService,
        InvitesService,
        CatalogService,
      ],
    };
  }
}
