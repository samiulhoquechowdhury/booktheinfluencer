import { Controller, Get, Inject } from '@nestjs/common';
import { NotFoundError } from '../common/errors';
import { PrismaService } from '../prisma/prisma.service';
import { toAuthUser } from '../auth/auth-user';
import { CurrentUser } from '../auth/decorators';
import type { AuthUserRef } from '../auth/guards';

@Controller('users')
export class UsersController {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  /** The signed-in account. */
  @Get('me')
  async me(@CurrentUser() user: AuthUserRef) {
    const found = await this.prisma.user.findFirst({ where: { id: user.id, deletedAt: null } });
    if (!found) throw new NotFoundError('User', user.id);
    return { data: toAuthUser(found) };
  }
}
