import { hash } from 'bcryptjs';
import { CreateGuardDto } from './access.dto';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AuthUser } from '../auth/auth.types';
import { Role } from '../common/role.enum';
import { AuditLog } from '../audit/audit-log.entity';
import { User } from '../users/user.entity';

@Injectable()
export class GuardAuthorizationService {
  constructor(private readonly dataSource: DataSource) {}

  async listGuards() {
    const guards = await this.dataSource.getRepository(User).find({
      where: { role: Role.GUARD },
      order: { email: 'ASC', id: 'ASC' },
    });
    return guards.map(guardProjection);
  }
  async createGuard(dto: CreateGuardDto, actor: AuthUser, ip?: string) {
    const email = dto.email.trim().toLowerCase();
    try {
      return await this.dataSource.transaction(async (manager) => {
        const users = manager.getRepository(User);
        if (await users.exists({ where: { email } }))
          throw new ConflictException('Email is already registered');
        const guard = await users.save(
          users.create({
            email,
            passwordHash: await hash(dto.password, 12),
            displayName: dto.displayName?.trim() ?? null,
            role: Role.GUARD,
            active: true,
            guardGateAuthorized: false,
            residentId: null,
          }),
        );
        const logs = manager.getRepository(AuditLog);
        await logs.save(
          logs.create({
            actorUserId: actor.sub,
            actorRole: actor.role,
            action: 'GUARD_CREATED',
            resourceType: 'USER',
            resourceId: guard.id,
            metadata: { authorized: false },
            ip: ip ?? null,
          }),
        );
        return guardProjection(guard);
      });
    } catch (error) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        (error as { code?: unknown }).code === '23505'
      )
        throw new ConflictException('Email is already registered');
      throw error;
    }
  }
  async setAuthorization(
    guardId: string,
    authorized: boolean,
    actor: AuthUser,
    ip?: string,
  ) {
    return this.dataSource.transaction(async (manager) => {
      const users = manager.getRepository(User);
      const guard = await users.findOne({
        where: { id: guardId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!guard || guard.role !== Role.GUARD) {
        throw new NotFoundException('GUARD account not found');
      }
      if (authorized && !guard.active) {
        throw new BadRequestException('Cannot authorize an inactive GUARD');
      }
      const previousAuthorization = guard.guardGateAuthorized;
      if (previousAuthorization === authorized) {
        return { id: guard.id, authorized };
      }

      guard.guardGateAuthorized = authorized;
      await users.save(guard);
      const auditLogs = manager.getRepository(AuditLog);
      await auditLogs.save(
        auditLogs.create({
          actorUserId: actor.sub,
          actorRole: actor.role,
          action: authorized
            ? 'GUARD_GATE_AUTHORIZATION_GRANTED'
            : 'GUARD_GATE_AUTHORIZATION_REVOKED',
          resourceType: 'USER',
          resourceId: guard.id,
          metadata: { from: previousAuthorization, to: authorized },
          ip: ip ?? null,
        }),
      );
      return { id: guard.id, authorized };
    });
  }
}

function guardProjection(guard: User) {
  return {
    id: guard.id,
    email: guard.email,
    displayName: guard.displayName,
    active: guard.active,
    authorized: guard.guardGateAuthorized,
  };
}
