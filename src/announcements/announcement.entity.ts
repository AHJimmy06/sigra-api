import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum AnnouncementStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED',
}

@Entity('announcements')
export class Announcement {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ length: 160 }) title!: string;
  @Column({ type: 'text' }) body!: string;
  @Column({ name: 'published_at', type: 'timestamptz', nullable: true })
  publishedAt!: Date | null;
  @Column({
    type: 'enum',
    enum: AnnouncementStatus,
    enumName: 'announcement_status',
    default: AnnouncementStatus.DRAFT,
  })
  status!: AnnouncementStatus;
  @Column({ name: 'author_user_id', type: 'uuid', nullable: true })
  authorUserId!: string | null;
  @CreateDateColumn({ name: 'created_at' }) createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt!: Date;
}
