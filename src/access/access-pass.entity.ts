import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Resident } from '../residents/resident.entity';

@Entity('access_passes')
export class AccessPass {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ name: 'resident_id', type: 'uuid' }) residentId!: string;
  @ManyToOne(() => Resident, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'resident_id' })
  resident!: Resident;
  @Column({ name: 'encrypted_secret', type: 'text' }) encryptedSecret!: string;
  @Column({ name: 'valid_until', type: 'timestamptz' }) validUntil!: Date;
  @Column({ name: 'revoked_at', type: 'timestamptz', nullable: true })
  revokedAt!: Date | null;
  @CreateDateColumn({ name: 'created_at' }) createdAt!: Date;
}
