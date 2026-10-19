import { createHmac, randomBytes } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { hashPassword, type Role } from '@repo/db';
import { STAFF_ROLES, type InviteAccept, type InviteCreate, type PageQuery } from '@repo/schemas';
import { AuditService } from '../audit/audit.service';
import type { AuthUserRef } from '../auth/guards';
import { OtpService, toE164 } from '../auth/otp.service';
import { DomainError, ForbiddenError, NotFoundError } from '../common/errors';
import { ENV, type Env } from '../config/env';
import { PrismaService } from '../prisma/prisma.service';

export const INVITE_TTL_DAYS = 7;

/** Who may invite which roles: super admins anything; talent managers only talent and reps. */
const INVITABLE: Partial<Record<Role, readonly Role[]>> = { TALENT_MANAGER: ['TALENT', 'REP'] };
const isStaffRole = (r: Role) => (STAFF_ROLES as readonly string[]).includes(r);
const mask = (phone: string | null) => (phone ? `••••${phone.slice(-4)}` : null);

/**
 * Invites (AUTH-3). Tokens are 32 random bytes, stored as an HMAC; links expire after 7 days and
 * work once. Email invites (staff) set a password; phone invites (talent/reps) prove the number
 * with an OTP. Existing accounts gain the invited roles rather than being duplicated.
 */
@Injectable()
export class InvitesService {
  constructor(
    @Inject(ENV) private readonly env: Env,
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(OtpService) private readonly otp: OtpService,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  private hash(token: string) {
    return createHmac('sha256', this.env.AUTH_SECRET).update(`invite:${token}`).digest('hex');
  }

  async create(input: InviteCreate, actor: AuthUserRef, ip?: string) {
    if (!actor.roles.includes('SUPER_ADMIN')) {
      const allowed = new Set(actor.roles.flatMap((r) => INVITABLE[r] ?? []));
      if (!input.roles.every((r) => allowed.has(r))) throw new ForbiddenError('You can’t invite people with these roles.');
    }
    if (input.talentId && !(await this.prisma.talent.findUnique({ where: { id: input.talentId } }))) throw new NotFoundError('Talent', input.talentId);
    if (input.repId && !(await this.prisma.representative.findUnique({ where: { id: input.repId } }))) throw new NotFoundError('Representative', input.repId);

    const token = randomBytes(32).toString('base64url');
    const invite = await this.prisma.$transaction(async (tx) => {
      const created = await tx.invite.create({
        data: {
          email: input.email ?? null,
          phone: input.phone ? toE164(input.phone) : null,
          name: input.name ?? null,
          roles: input.roles,
          talentId: input.talentId ?? null,
          repId: input.repId ?? null,
          tokenHash: this.hash(token),
          invitedById: actor.id,
          expiresAt: new Date(Date.now() + INVITE_TTL_DAYS * 86_400_000),
        },
      });
      await this.audit.record({ actorId: actor.id, action: 'invite.create', entity: 'invite', entityId: created.id, after: { email: created.email, phone: mask(created.phone), roles: created.roles, talentId: created.talentId, repId: created.repId }, ip }, tx);
      return created;
    });
    // Sending by email/SMS comes with the notifications worker; for now the link is returned.
    return { id: invite.id, url: `${this.env.INVITE_BASE_URL}/${token}`, expiresAt: invite.expiresAt.toISOString() };
  }

  private async findUsable(token: string) {
    const invite = await this.prisma.invite.findUnique({ where: { tokenHash: this.hash(token) } });
    if (!invite) throw new DomainError('INVITE_INVALID', 'This invite link isn’t valid.', 404);
    if (invite.acceptedAt) throw new DomainError('INVITE_USED', 'This invite has already been used. Sign in instead.', 410);
    if (invite.revokedAt) throw new DomainError('INVITE_REVOKED', 'This invite was withdrawn. Ask your contact for a new one.', 410);
    if (invite.expiresAt <= new Date()) throw new DomainError('INVITE_EXPIRED', 'This invite has expired. Ask your contact for a new one.', 410);
    return invite;
  }

  /** Public preview for the accept page. */
  async preview(token: string) {
    const i = await this.findUsable(token);
    return { name: i.name, email: i.email, phone: mask(i.phone), roles: i.roles, expiresAt: i.expiresAt.toISOString(), method: i.email ? ('password' as const) : ('otp' as const) };
  }

  async accept(token: string, body: InviteAccept, ip?: string) {
    const invite = await this.findUsable(token);
    if (invite.email && !body.password) throw new DomainError('PASSWORD_REQUIRED', 'Choose a password (at least 12 characters).', 400);
    if (invite.phone) {
      if (!body.code) throw new DomainError('CODE_REQUIRED', 'Enter the code we texted you.', 400);
      await this.otp.checkCode(invite.phone, body.code);
    }
    const passwordHash = invite.email && body.password ? await hashPassword(body.password) : null;

    const user = await this.prisma.$transaction(async (tx) => {
      // Single use, even under concurrent accepts.
      const { count } = await tx.invite.updateMany({ where: { id: invite.id, acceptedAt: null, revokedAt: null }, data: { acceptedAt: new Date() } });
      if (count !== 1) throw new DomainError('INVITE_USED', 'This invite has already been used. Sign in instead.', 410);

      const where = invite.email ? { email: invite.email } : { phone: invite.phone! };
      const existing = await tx.user.findUnique({ where });
      if (existing?.deletedAt) throw new ForbiddenError('This account has been closed. Contact support.');
      const roles = [...new Set([...(existing?.roles ?? []), ...invite.roles])];
      const saved = existing
        ? await tx.user.update({ where: { id: existing.id }, data: { roles, name: existing.name ?? body.name ?? invite.name, passwordHash: existing.passwordHash ?? passwordHash } })
        : await tx.user.create({ data: { ...where, roles, name: body.name ?? invite.name, passwordHash } });

      if (invite.talentId) {
        const t = await tx.talent.findUniqueOrThrow({ where: { id: invite.talentId } });
        if (t.userId && t.userId !== saved.id) throw new DomainError('ALREADY_LINKED', 'This talent profile already has a login.', 409);
        await tx.talent.update({ where: { id: t.id }, data: { userId: saved.id } });
      }
      if (invite.repId) {
        const r = await tx.representative.findUniqueOrThrow({ where: { id: invite.repId } });
        if (r.userId && r.userId !== saved.id) throw new DomainError('ALREADY_LINKED', 'This representative already has a login.', 409);
        await tx.representative.update({ where: { id: r.id }, data: { userId: saved.id } });
      }
      await tx.invite.update({ where: { id: invite.id }, data: { acceptedBy: saved.id } });
      await this.audit.record({ actorId: saved.id, action: 'invite.accept', entity: 'invite', entityId: invite.id, before: { roles: existing?.roles ?? [] }, after: { userId: saved.id, roles }, ip }, tx);
      return saved;
    });
    return { user, nextStep: invite.roles.some(isStaffRole) ? ('staff-login' as const) : ('signed-in' as const) };
  }

  async list({ page, pageSize }: PageQuery) {
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.invite.findMany({ orderBy: { createdAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize, include: { invitedBy: { select: { name: true } } } }),
      this.prisma.invite.count(),
    ]);
    const status = (i: (typeof rows)[number]) => (i.acceptedAt ? 'ACCEPTED' : i.revokedAt ? 'REVOKED' : i.expiresAt <= new Date() ? 'EXPIRED' : 'PENDING');
    return {
      data: rows.map((i) => ({ id: i.id, email: i.email, phone: mask(i.phone), name: i.name, roles: i.roles, status: status(i), invitedBy: i.invitedBy.name, expiresAt: i.expiresAt.toISOString(), createdAt: i.createdAt.toISOString() })),
      meta: { page, pageSize, total },
    };
  }

  async revoke(id: string, actor: AuthUserRef, ip?: string) {
    const { count } = await this.prisma.invite.updateMany({ where: { id, acceptedAt: null, revokedAt: null }, data: { revokedAt: new Date() } });
    if (count !== 1) throw new NotFoundError('Pending invite', id);
    await this.audit.record({ actorId: actor.id, action: 'invite.revoke', entity: 'invite', entityId: id, ip });
  }
}
