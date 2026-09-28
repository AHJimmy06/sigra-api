import {
  BadRequestException,
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
