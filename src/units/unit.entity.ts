import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('units')
export class ResidentialUnit {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column() code!: string;
  @Column() address!: string;
  @Column({ name: 'parking_spaces', type: 'int', default: 0 })
  parkingSpaces!: number;
  @Column({ default: true }) active!: boolean;
  @Column({ name: 'archived_at', type: 'timestamptz', nullable: true })
  archivedAt!: Date | null;
  @Column({ name: 'archived_by_user_id', type: 'uuid', nullable: true })
  archivedByUserId!: string | null;
  @CreateDateColumn({ name: 'created_at' }) createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt!: Date;
}
