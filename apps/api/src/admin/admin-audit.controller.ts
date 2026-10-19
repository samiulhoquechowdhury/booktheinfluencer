import { Controller, Get, Inject, Query } from '@nestjs/common';
import { PageQuerySchema, type PageQuery } from '@repo/schemas';
import { z } from 'zod';
import { Roles } from '../auth/decorators';
import { ZodPipe } from '../common/zod.pipe';
import { PrismaService } from '../prisma/prisma.service';

const AuditQuerySchema = PageQuerySchema.extend({ entity: z.string().optional(), entityId: z.string().optional(), actorId: z.string().optional() });

/** T-126 read side (AUD-1..3): newest first, filter by entity / actor. */
@Controller('admin/audit')
@Roles('SUPER_ADMIN')
export class AdminAuditController {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  @Get()
  async list(@Query(new ZodPipe(AuditQuerySchema)) q: z.infer<typeof AuditQuerySchema>) {
    const where = { entity: q.entity, entityId: q.entityId, actorId: q.actorId };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (q.page - 1) * q.pageSize, take: q.pageSize }),
      this.prisma.auditLog.count({ where }),
    ]);
    return { data: rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })), meta: { page: q.page, pageSize: q.pageSize, total } };
  }
}
