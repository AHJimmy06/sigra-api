import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { AuthUser } from '../auth/auth.types';
import { AuditLog } from './audit-log.entity';

export interface AuditEvent {
  actor?: AuthUser;
  action: string;
  resourceType: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
  ip?: string;
}

@Injectable()
export class AuditService {
  record(manager: EntityManager, event: AuditEvent) {
    const repository = manager.getRepository(AuditLog);
    return repository.save(
      repository.create({
        actorUserId: event.actor?.sub ?? null,
        actorRole: event.actor?.role ?? null,
        action: event.action,
        resourceType: event.resourceType,
        resourceId: event.resourceId ?? null,
        metadata: event.metadata ?? {},
        ip: event.ip ?? null,
      }),
    );
  }
}
