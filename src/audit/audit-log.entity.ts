import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Role } from '../common/role.enum';

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid', { name: 'audit_id' }) auditId!: string;
  @Column({ name: 'actor_user_id', type: 'uuid', nullable: true })
  actorUserId!: string | null;
  @Column({
    name: 'actor_role',
    type: 'enum',
    enum: Role,
    enumName: 'user_role',
    nullable: true,
  })
  actorRole!: Role | null;
  @Column({ type: 'varchar' }) action!: string;
  @Column({ name: 'resource_type', type: 'varchar' }) resourceType!: string;
  @Column({ name: 'resource_id', type: 'uuid', nullable: true })
  resourceId!: string | null;
  @Column({ type: 'jsonb', default: {} }) metadata!: Record<string, unknown>;
  @Column({ type: 'varchar', nullable: true }) ip!: string | null;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
