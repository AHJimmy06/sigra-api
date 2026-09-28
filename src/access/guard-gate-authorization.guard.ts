import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Request } from 'express';
import { Repository } from 'typeorm';
import { AuthUser } from '../auth/auth.types';
import { Role } from '../common/role.enum';
import { User } from '../users/user.entity';

@Injectable()
export class GuardGateAuthorizationGuard implements CanActivate {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<Request & { user: AuthUser }>();
    const user = request.user;
    const persisted =
      user?.role === Role.GUARD
        ? await this.users.findOne({
            where: { id: user.sub, role: Role.GUARD, active: true },
            select: { id: true, guardGateAuthorized: true },
          })
        : null;
    if (!persisted?.guardGateAuthorized) {
      throw new ForbiddenException('GUARD gate authorization is required');
    }
    return true;
  }
}
