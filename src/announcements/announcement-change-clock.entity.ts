import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('announcement_change_clock')
export class AnnouncementChangeClock {
  @PrimaryColumn({ type: 'smallint' }) id!: number;
  @Column({ type: 'numeric', precision: 20, scale: 0 }) value!: string;
}
