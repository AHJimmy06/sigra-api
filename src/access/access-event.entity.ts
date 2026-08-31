import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

export enum AccessDecision {
  ALLOWED = 'ALLOWED',
  DENIED = 'DENIED',
}
export enum AccessDirection {
  ENTRY = 'ENTRY',
  EXIT = 'EXIT',
}

@Entity('access_events')
export class AccessEvent {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ name: 'client_event_id', type: 'uuid', unique: true })
  clientEventId!: string;
  @Column({ name: 'pass_id', type: 'uuid', nullable: true }) passId!:
    string | null;
  @Column({ name: 'guard_id', type: 'uuid' }) guardId!: string;
  @Column({ type: 'enum', enum: AccessDecision }) decision!: AccessDecision;
  @Column({ type: 'enum', enum: AccessDirection }) direction!: AccessDirection;
  @Column() reason!: string;
  @CreateDateColumn({ name: 'occurred_at' }) occurredAt!: Date;
}
