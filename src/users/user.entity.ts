import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Role } from '../common/role.enum';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column() email!: string;
  @Column({ name: 'password_hash' }) passwordHash!: string;
  @Column({ type: 'enum', enum: Role }) role!: Role;
  @Column({ default: true }) active!: boolean;
  @Column({
    name: 'display_name',
    type: 'varchar',
    length: 120,
    nullable: true,
  })
  displayName!: string | null;
  @Column({ name: 'resident_id', type: 'uuid', nullable: true }) residentId!:
    string | null;
  @CreateDateColumn({ name: 'created_at' }) createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt!: Date;
}
