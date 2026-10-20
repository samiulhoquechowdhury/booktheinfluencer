import 'reflect-metadata';
import type { DynamicModule } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import type { Env } from './config/env';

/** Builds the configured app (shared by main.ts and the e2e tests, which pass a wrapping module). */
export async function createApp(env: Env, root: DynamicModule = AppModule.forRoot(env)): Promise<NestExpressApplication> {
  const app = await NestFactory.create<NestExpressApplication>(root, { bufferLogs: true, rawBody: true }); // rawBody: webhook signatures
  app.useLogger(app.get(Logger));
  app.setGlobalPrefix('v1');
  app.use(helmet());
  // Strict CORS: only the web and admin origins, with cookies for the refresh token (trd §10).
  app.enableCors({ origin: env.CORS_ORIGINS, credentials: true });
  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.enableShutdownHooks();
  return app;
}
