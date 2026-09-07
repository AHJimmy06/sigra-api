import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum TicketStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  RESOLVED = 'RESOLVED',
}
export enum TicketPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}
@Entity('maintenance_tickets')
export class MaintenanceTicket {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ name: 'client_request_id', type: 'uuid', unique: true })
  clientRequestId!: string;
  @Column({ name: 'resident_id', type: 'uuid' }) residentId!: string;
  @Column({ type: 'text' }) description!: string;
  @Column({ name: 'image_name' }) imageName!: string;
  @Column({ type: 'enum', enum: TicketStatus, default: TicketStatus.OPEN })
  status!: TicketStatus;
  @Column({
    type: 'enum',
    enum: TicketPriority,
    enumName: 'ticket_priority',
    default: TicketPriority.MEDIUM,
  })
  priority!: TicketPriority;
  @CreateDateColumn({ name: 'created_at' }) createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt!: Date;
}
