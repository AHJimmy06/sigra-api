import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../users/user.entity';

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
  @Column({ name: 'author_id_snapshot', type: 'uuid', nullable: true })
  authorIdSnapshot!: string | null;
  @Column({
    name: 'author_display_name_snapshot',
    type: 'varchar',
    length: 120,
    nullable: true,
  })
  authorDisplayNameSnapshot!: string | null;
  @Column({ name: 'author_email_snapshot', type: 'varchar', nullable: true })
  authorEmailSnapshot!: string | null;
  @ManyToOne(() => User, { nullable: true, createForeignKeyConstraints: false })
  @JoinColumn({ name: 'author_user_id' })
  author!: User | null;
  @CreateDateColumn({ name: 'created_at' }) createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt!: Date;
}
