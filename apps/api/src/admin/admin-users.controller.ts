import { Body, Controller, Get, Inject, Param, Patch, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import { PageQuerySchema, UpdateRolesSchema, type PageQuery, type UpdateRoles } from '@repo/schemas';
import { AuditService } from '../audit/audit.service';
import { toAuthUser } from '../auth/auth-user';
import { CurrentUser, Roles } from '../auth/decorators';
import type { AuthUserRef } from '../auth/guards';
import { TokensService } from '../auth/tokens.service';
import { DomainError, NotFoundError } from '../common/errors';
import { ZodPipe } from '../common/zod.pipe';
import { PrismaService } from '../prisma/prisma.service';

/** T-125 (API): users & roles. Super admins only. */
@Controller('admin/users')
@Roles('SUPER_ADMIN')
export class AdminUsersController {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(TokensService) private readonly tokens: TokensService,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  @Get()
  async list(@Query(new ZodPipe(PageQuerySchema)) { page, pageSize }: PageQuery) {
    const where = { deletedAt: null };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
      this.prisma.user.count({ where }),
    ]);
    return {
      data: rows.map((u) => ({ ...toAuthUser(u), mfaEnabled: Boolean(u.mfaEnabledAt), createdAt: u.createdAt.toISOString() })),
      meta: { page, pageSize, total },
    };
  }

  /** Changing roles signs the person out everywhere so new tokens carry the new roles. */
  @Patch(':id/roles')
  async updateRoles(@Param('id') id: string, @Body(new ZodPipe(UpdateRolesSchema)) body: UpdateRoles, @CurrentUser() actor: AuthUserRef, @Req() req: Request) {
    const user = await this.prisma.user.findFirst({ where: { id, deletedAt: null } });
    if (!user) throw new NotFoundError('User', id);
    const roles = [...new Set(body.roles)];
    if (id === actor.id && !roles.includes('SUPER_ADMIN')) throw new DomainError('SELF_LOCKOUT', 'You can’t remove your own super admin access.', 409);

    const updated = await this.prisma.$transaction(async (tx) => {
      const saved = await tx.user.update({ where: { id }, data: { roles } });
      await this.audit.record({ actorId: actor.id, action: 'user.roles.update', entity: 'user', entityId: id, before: { roles: user.roles }, after: { roles }, ip: req.ip }, tx);
      return saved;
    });
    await this.tokens.revokeAll(id);
    return { data: toAuthUser(updated) };
  }
}
