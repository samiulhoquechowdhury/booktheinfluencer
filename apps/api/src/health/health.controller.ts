import { Controller, Get, Inject } from '@nestjs/common';
import { Public } from '../auth/decorators';
import { DomainError } from '../common/errors';
import { PrismaService } from '../prisma/prisma.service';

/** Liveness + database check for uptime monitoring (T-264) and deploy health checks. */
@Public()
@Controller('health')
export class HealthController {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  @Get()
  async check() {
    const started = performance.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      throw new DomainError('DB_UNAVAILABLE', 'The database is not reachable.', 503);
    }
    return { data: { status: 'ok', db: 'ok', dbLatencyMs: Math.round(performance.now() - started) } };
  }
}
