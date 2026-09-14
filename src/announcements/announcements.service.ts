import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { AuthUser } from '../auth/auth.types';
import { User } from '../users/user.entity';
import { CreateAnnouncementDto } from './announcement.dto';
import { Announcement, AnnouncementStatus } from './announcement.entity';
import { mapAnnouncementResponse } from './announcement.mapper';
import { AnnouncementPatchCommand } from './announcement-patch.pipe';
import { AnnouncementChange } from './announcement-change.entity';
import { AnnouncementChangeClock } from './announcement-change-clock.entity';

@Injectable()
export class AnnouncementsService {
  constructor(
    @InjectRepository(Announcement)
    private readonly announcementRepository: Repository<Announcement>,
    private readonly dataSource: DataSource,
    private readonly audit: AuditService,
  ) {}

  async list(params: {
    page: number;
    pageSize: number;
    search?: string;
    status?: AnnouncementStatus;
  }) {
    const query =
      this.announcementRepository.createQueryBuilder('announcement');
    if (params.search) {
      query.andWhere(
        '(announcement.title ILIKE :search OR announcement.body ILIKE :search)',
        {
          search: `%${params.search}%`,
        },
      );
    }
    if (params.status !== undefined) {
      query.andWhere('announcement.status = :status', {
        status: params.status,
      });
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
      const author = await manager.getRepository(User).findOneByOrFail({
        id: actor.sub,
        active: true,
      });
      const announcements = manager.getRepository(Announcement);
      const published = dto.published === true;
      const announcement = await announcements.save(
        announcements.create({
          title: dto.title,
          body: dto.body,
          status: published
            ? AnnouncementStatus.PUBLISHED
            : AnnouncementStatus.DRAFT,
          publishedAt: published ? new Date() : null,
          authorUserId: author.id,
          authorIdSnapshot: author.id,
          authorDisplayNameSnapshot: author.displayName,
          authorEmailSnapshot: author.email.trim().toLowerCase(),
        }),
      );
      await this.audit.record(manager, {
        actor,
        action: 'ANNOUNCEMENT_CREATED',
        resourceType: 'ANNOUNCEMENT',
        resourceId: announcement.id,
      });
      if (published) {
        await this.audit.record(manager, {
          actor,
          action: 'ANNOUNCEMENT_PUBLISHED',
          resourceType: 'ANNOUNCEMENT',
          resourceId: announcement.id,
          metadata: {
            status: {
              from: AnnouncementStatus.DRAFT,
              to: AnnouncementStatus.PUBLISHED,
            },
          },
        });
        await this.recordChange(manager, announcement, 'UPSERT', 'PUBLISHED');
      }
      return mapAnnouncementResponse(announcement);
    });
  }

  update(id: string, command: AnnouncementPatchCommand, actor: AuthUser) {
    return this.runMutation(
      id,
      async (manager, announcements, announcement) => {
        if (announcement.status === AnnouncementStatus.ARCHIVED) {
          throw new ConflictException('Archived announcements are read-only');
        }
        if (command.kind === 'CONTENT') {
          const changedFields = (['title', 'body'] as const).filter(
            (key) =>
              command[key] !== undefined && command[key] !== announcement[key],
          );
          if (!changedFields.length)
            return mapAnnouncementResponse(announcement);
          changedFields.forEach((key) => (announcement[key] = command[key]!));
          const saved = await announcements.save(announcement);
          await this.audit.record(manager, {
            actor,
            action: 'ANNOUNCEMENT_UPDATED',
            resourceType: 'ANNOUNCEMENT',
            resourceId: id,
            metadata: { changedFields: changedFields.sort() },
          });
          if (saved.status === AnnouncementStatus.PUBLISHED) {
            await this.recordChange(manager, saved, 'UPSERT', 'UPDATED');
          }
          return mapAnnouncementResponse(saved);
        }
        const target = command.published
          ? AnnouncementStatus.PUBLISHED
          : AnnouncementStatus.DRAFT;
        if (announcement.status === target)
          return mapAnnouncementResponse(announcement);
        const from = announcement.status;
        announcement.status = target;
        if (command.published && !announcement.publishedAt)
          announcement.publishedAt = new Date();
        const saved = await announcements.save(announcement);
        await this.audit.record(manager, {
          actor,
          action: command.published
            ? 'ANNOUNCEMENT_PUBLISHED'
            : 'ANNOUNCEMENT_WITHDRAWN',
          resourceType: 'ANNOUNCEMENT',
          resourceId: id,
          metadata: { status: { from, to: target } },
        });
        await this.recordChange(
          manager,
          saved,
          command.published ? 'UPSERT' : 'TOMBSTONE',
          command.published ? 'PUBLISHED' : 'WITHDRAWN',
        );
        return mapAnnouncementResponse(saved);
      },
    );
  }

  archive(id: string, actor: AuthUser) {
    return this.runMutation(
      id,
      async (manager, announcements, announcement) => {
        if (announcement.status === AnnouncementStatus.ARCHIVED)
          return mapAnnouncementResponse(announcement);
        const from = announcement.status;
        announcement.status = AnnouncementStatus.ARCHIVED;
        const saved = await announcements.save(announcement);
        await this.audit.record(manager, {
          actor,
          action: 'ANNOUNCEMENT_ARCHIVED',
          resourceType: 'ANNOUNCEMENT',
          resourceId: id,
          metadata: { status: { from, to: AnnouncementStatus.ARCHIVED } },
        });
        if (from === AnnouncementStatus.PUBLISHED) {
          await this.recordChange(manager, saved, 'TOMBSTONE', 'ARCHIVED');
        }
        return mapAnnouncementResponse(saved);
      },
    );
  }

  private runMutation<T>(
    id: string,
    mutation: (
      manager: EntityManager,
      announcements: Repository<Announcement>,
      announcement: Announcement,
    ) => Promise<T>,
  ) {
    return this.dataSource.transaction(async (manager) => {
      const announcements = manager.getRepository(Announcement);
      const announcement = await announcements.findOne({
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!announcement) throw new NotFoundException('Announcement not found');
      return mutation(manager, announcements, announcement);
    });
  }

  private async recordChange(
    manager: EntityManager,
    announcement: Announcement,
    kind: 'UPSERT' | 'TOMBSTONE',
    action: 'PUBLISHED' | 'UPDATED' | 'WITHDRAWN' | 'ARCHIVED',
  ) {
    const clocks = manager.getRepository(AnnouncementChangeClock);
    const clock = await clocks.findOne({
      where: { id: 1 },
      lock: { mode: 'pessimistic_write' },
    });
    if (!clock) throw new Error('Announcement change clock is missing');
    const position = (BigInt(clock.value) + 1n).toString();
    clock.value = position;
    await clocks.save(clock);
    const changes = manager.getRepository(AnnouncementChange);
    await changes.save(
      changes.create({
        position,
        announcementId: announcement.id,
        kind,
        action,
        title: kind === 'UPSERT' ? announcement.title : null,
        body: kind === 'UPSERT' ? announcement.body : null,
        publishedAt: kind === 'UPSERT' ? announcement.publishedAt : null,
        authorDisplayName:
          kind === 'UPSERT' ? announcement.authorDisplayNameSnapshot : null,
        occurredAt: new Date(),
      }),
    );
  }
}
