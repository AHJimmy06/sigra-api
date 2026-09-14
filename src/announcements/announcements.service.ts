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
import { mapAnnouncementResponse } from './announcement.mapper';

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
  ) {
    const query = this.announcementRepository.createQueryBuilder('announcement');
    if (params.search) {
      query.andWhere(
        '(announcement.title ILIKE :search OR announcement.body ILIKE :search)',
        { search: `%${params.search}%` },
      );
    }
    if (params.status !== undefined) {
      query.andWhere('announcement.status = :status', { status: params.status });
    } else {
      query.andWhere('announcement.status <> :archivedStatus', {
        archivedStatus: AnnouncementStatus.ARCHIVED,
      });
    }
    const total = await query.getCount();
    const result = await query
      .orderBy('announcement.updatedAt', 'DESC')
      .addOrderBy('announcement.id', 'DESC')
      .skip((params.page - 1) * params.pageSize)
      .take(params.pageSize)
      .getRawAndEntities();
    return {
      items: result.entities.map(mapAnnouncementResponse),
      total,
      page: params.page,
      pageSize: params.pageSize,
    };
  }

  async findOne(id: string) {
    const announcement = await this.announcementRepository.findOneBy({ id });
    if (!announcement) throw new NotFoundException('Announcement not found');
    return mapAnnouncementResponse(announcement);
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
