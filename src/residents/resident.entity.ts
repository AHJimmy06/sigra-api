import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ResidentialUnit } from '../units/unit.entity';
import { ApiHideProperty } from '@nestjs/swagger';

@Entity('residents')
export class Resident {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column() name!: string;
  @Column({ type: 'varchar', nullable: true }) phone!: string | null;
  @Column({ default: true }) active!: boolean;
  @Column({ name: 'unit_id', type: 'uuid' }) unitId!: string;
  @ManyToOne(() => ResidentialUnit, { eager: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'unit_id' })
  @ApiHideProperty()
  unit!: ResidentialUnit;
  @CreateDateColumn({ name: 'created_at' }) createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt!: Date;
}
