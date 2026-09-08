import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Resident } from '../residents/resident.entity';
import { ResidentialUnit } from '../units/unit.entity';
import { User } from '../users/user.entity';
import { ApiHideProperty } from '@nestjs/swagger';

export enum AccessDecision {
  ALLOWED = 'ALLOWED',
  DENIED = 'DENIED',
}
export enum AccessDirection {
  ENTRY = 'ENTRY',
  EXIT = 'EXIT',
}

@Entity('access_events')
@Index('idx_access_events_filters', [
  'decision',
  'direction',
  'occurredAt',
  'id',
])
export class AccessEvent {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ name: 'client_event_id', type: 'uuid', unique: true })
  clientEventId!: string;
  @Column({
    name: 'request_fingerprint',
    type: 'varchar',
    length: 64,
    nullable: true,
  })
  requestFingerprint!: string | null;
  @Column({ name: 'request_id', type: 'varchar', length: 128, nullable: true })
  requestId!: string | null;
  @Column({ name: 'pass_id', type: 'uuid', nullable: true }) passId!:
    string | null;
  @Column({ name: 'guard_id', type: 'uuid' }) guardId!: string;
  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'guard_id' })
  @ApiHideProperty()
  guard!: User;
  @Column({ name: 'resident_id', type: 'uuid', nullable: true }) residentId!:
    string | null;
  @ManyToOne(() => Resident, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'resident_id' })
  @ApiHideProperty()
  resident!: Resident | null;
  @Column({ name: 'unit_id', type: 'uuid', nullable: true }) unitId!:
    string | null;
  @ManyToOne(() => ResidentialUnit, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'unit_id' })
  @ApiHideProperty()
  unit!: ResidentialUnit | null;
  @Column({ type: 'enum', enum: AccessDecision }) decision!: AccessDecision;
  @Column({ type: 'enum', enum: AccessDirection }) direction!: AccessDirection;
  @Column() reason!: string;
  @CreateDateColumn({ name: 'occurred_at' }) occurredAt!: Date;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
