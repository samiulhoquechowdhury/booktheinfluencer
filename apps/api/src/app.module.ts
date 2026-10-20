import { randomUUID } from 'node:crypto';
import { type DynamicModule, Global, Module } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { LoggerModule } from 'nestjs-pino';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { GlobalErrorFilter } from './common/error.filter';
import { ENV, type Env } from './config/env';
import { AdminAuditController } from './admin/admin-audit.controller';
import { AdminCatalogController } from './admin-catalog/admin-catalog.controller';
import { AdminCatalogService } from './admin-catalog/admin-catalog.service';
import { RevalidateWebInterceptor } from './admin-catalog/revalidate-web.interceptor';
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
import { EnquiriesController } from './pipeline/enquiries.controller';
import { EnquiriesService } from './pipeline/enquiries.service';
import { PipelineController } from './pipeline/pipeline.controller';
import { PipelineService } from './pipeline/pipeline.service';
import { CustomerBookingsService } from './quotes/customer-bookings.service';
import { AdminQuotesController, CustomerBookingsController } from './quotes/quotes.controller';
import { QuotesService } from './quotes/quotes.service';
import { ContractsService } from './contracts/contracts.service';
import { ESIGN_PROVIDER, FakeESign } from './contracts/esign';
import { FakeGateway, PAYMENT_GATEWAY } from './payments/gateway';
import { AdminPaymentsController, CustomerPaymentsController, WebhooksController } from './payments/payments.controller';
import { PaymentsService } from './payments/payments.service';
import { PortalController } from './portal/portal.controller';
import { PortalService } from './portal/portal.service';
import { AnalyticsService } from './settlement/analytics.service';
import { PayoutsService } from './settlement/payouts.service';
import { AdminAnalyticsController, AdminPayoutsController } from './settlement/settlement.controller';
import { UsersController } from './users/users.controller';
import { ContactController, FavouritesController } from './users/me.controller';

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
      controllers: [HealthController, CatalogController, UsersController, InvitesController, AdminInvitesController, AdminUsersController, AdminAuditController, AdminCatalogController, EnquiriesController, PipelineController, AdminQuotesController, CustomerBookingsController, AdminPaymentsController, CustomerPaymentsController, WebhooksController, PortalController, FavouritesController, ContactController, AdminPayoutsController, AdminAnalyticsController],
      providers: [
        { provide: APP_FILTER, useClass: GlobalErrorFilter },
        { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
        AuditService,
        InvitesService,
        CatalogService,
        AdminCatalogService,
        RevalidateWebInterceptor,
        EnquiriesService,
        PipelineService,
        QuotesService,
        CustomerBookingsService,
        PaymentsService,
        ContractsService,
        PortalService,
        PayoutsService,
        AnalyticsService,
        // Only the fake adapters exist until vendors are chosen (memory.md open questions); env validation refuses them in production.
        { provide: PAYMENT_GATEWAY, useFactory: (e: Env) => new FakeGateway(e.PAYMENT_WEBHOOK_SECRET, e.WEB_BASE_URL), inject: [ENV] },
        { provide: ESIGN_PROVIDER, useFactory: (e: Env) => new FakeESign(e.ESIGN_WEBHOOK_SECRET), inject: [ENV] },
      ],
    };
  }
}
