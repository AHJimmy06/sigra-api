import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { Announcement } from './announcement.entity';

@Entity('announcement_changes')
export class AnnouncementChange {
  @PrimaryColumn({ type: 'numeric', precision: 20, scale: 0 })
  position!: string;
  @Column({ name: 'announcement_id', type: 'uuid' }) announcementId!: string;
  @ManyToOne(() => Announcement, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'announcement_id' })
  announcement!: Announcement;
  @Column() kind!: 'UPSERT' | 'TOMBSTONE';
  @Column() action!: 'PUBLISHED' | 'UPDATED' | 'WITHDRAWN' | 'ARCHIVED';
  @Column({ type: 'text', nullable: true }) title!: string | null;
  @Column({ type: 'text', nullable: true }) body!: string | null;
  @Column({ name: 'published_at', type: 'timestamptz', nullable: true })
  publishedAt!: Date | null;
  @Column({
    name: 'author_display_name',
    type: 'varchar',
    length: 120,
    nullable: true,
  })
  authorDisplayName!: string | null;
  @Column({ name: 'occurred_at', type: 'timestamptz' }) occurredAt!: Date;
}
