import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { AuthUser } from '../auth/auth.types';
import { Role } from '../common/role.enum';
import { User } from '../users/user.entity';
import {
  CreateAnnouncementDto,
  UpdateAnnouncementDto,
} from './announcement.dto';
import { Announcement, AnnouncementStatus } from './announcement.entity';

@Injectable()
export class AnnouncementsService {
  constructor(
    @InjectRepository(Announcement)
    private readonly announcementRepository: Repository<Announcement>,
    private readonly dataSource: DataSource,
    private readonly audit: AuditService,
  ) {}

  async list(
    params: {
      page: number;
      pageSize: number;
      search?: string;
      status?: AnnouncementStatus;
    },
    actor: AuthUser,
  ) {
    const { page, pageSize, search, status } = params;
    const query = this.announcementRepository
      .createQueryBuilder('announcement')
      .leftJoin(User, 'author', 'author.id = announcement.authorUserId')
      .addSelect('author.email', 'author_email');
    if (search) {
      query.andWhere(
        '(announcement.title ILIKE :search OR announcement.body ILIKE :search)',
        { search: `%${search}%` },
      );
    }
    if (actor.role === Role.RESIDENT) {
      query.andWhere('announcement.status = :residentStatus', {
        residentStatus: AnnouncementStatus.PUBLISHED,
      });
    } else if (status !== undefined) {
      query.andWhere('announcement.status = :status', { status });
    }
    const total = await query.getCount();
    const result = await query
      .orderBy('announcement.createdAt', 'DESC')
      .addOrderBy('announcement.id', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getRawAndEntities();
    const items = result.entities.map((announcement, index) => {
      const raw = result.raw[index] as Record<string, unknown> | undefined;
      return this.toResponse(
        announcement,
        typeof raw?.author_email === 'string' ? raw.author_email : null,
      );
    });
    return { items, total, page, pageSize };
  }

  create(dto: CreateAnnouncementDto, actor: AuthUser) {
    return this.dataSource.transaction(async (manager) => {
      const announcements = manager.getRepository(Announcement);
      const announcement = await announcements.save(
        announcements.create({
          title: dto.title,
          body: dto.body,
          publishedAt: dto.published ? new Date() : null,
          status: dto.published
            ? AnnouncementStatus.PUBLISHED
            : AnnouncementStatus.DRAFT,
          authorUserId: actor.sub,
        }),
      );
      await this.audit.record(manager, {
        actor,
        action: dto.published
          ? 'ANNOUNCEMENT_PUBLISHED'
          : 'ANNOUNCEMENT_CREATED',
        resourceType: 'ANNOUNCEMENT',
        resourceId: announcement.id,
      });
      return this.toResponse(announcement, actor.email);
    });
  }

  update(id: string, dto: UpdateAnnouncementDto, actor: AuthUser) {
    return this.dataSource.transaction(async (manager) => {
      const announcements = manager.getRepository(Announcement);
      const announcement = await announcements.findOne({ where: { id } });
      if (!announcement) throw new NotFoundException('Announcement not found');
      const previousStatus = announcement.status;
      if (dto.title !== undefined) announcement.title = dto.title;
      if (dto.body !== undefined) announcement.body = dto.body;
      if (dto.published !== undefined) {
        announcement.status = dto.published
          ? AnnouncementStatus.PUBLISHED
          : AnnouncementStatus.DRAFT;
        if (dto.published && !announcement.publishedAt) {
          announcement.publishedAt = new Date();
        }
      }
      const saved = await announcements.save(announcement);
      const publicationChanged =
        dto.published !== undefined && announcement.status !== previousStatus;
      await this.audit.record(manager, {
        actor,
        action: publicationChanged
          ? dto.published
            ? 'ANNOUNCEMENT_PUBLISHED'
            : 'ANNOUNCEMENT_WITHDRAWN'
          : 'ANNOUNCEMENT_UPDATED',
        resourceType: 'ANNOUNCEMENT',
        resourceId: id,
      });
      return this.toResponse(saved, actor.email);
    });
  }

  async remove(id: string, actor: AuthUser) {
    return this.dataSource.transaction(async (manager) => {
      const announcements = manager.getRepository(Announcement);
      const announcement = await announcements.findOne({ where: { id } });
      if (!announcement) throw new NotFoundException('Announcement not found');
      const previousStatus = announcement.status;
      announcement.status = AnnouncementStatus.ARCHIVED;
      const saved = await announcements.save(announcement);
      await this.audit.record(manager, {
        actor,
        action: 'ANNOUNCEMENT_ARCHIVED',
        resourceType: 'ANNOUNCEMENT',
        resourceId: id,
        metadata: { status: { from: previousStatus, to: saved.status } },
      });
      return this.toResponse(saved, actor.email);
    });
  }

  private toResponse(announcement: Announcement, authorEmail: string | null) {
    return {
      ...announcement,
      author:
        announcement.authorUserId && authorEmail
          ? {
              id: announcement.authorUserId,
              name: authorEmail,
              email: authorEmail,
            }
          : null,
    };
  }
}
