import { Inject, Injectable, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@repo/db';
import { ENV, type Env } from '../config/env';

/**
 * Prisma client as a Nest provider: connects on boot, disconnects on shutdown. The URL comes from
 * the validated env, not Prisma's own .env loading (which would point tests at the dev database).
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor(@Inject(ENV) env: Env) {
    super({ datasourceUrl: env.DATABASE_URL });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
