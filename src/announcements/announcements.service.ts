import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Not, Repository } from 'typeorm';
import { Announcement } from './announcement.entity';
import {
  CreateAnnouncementDto,
  UpdateAnnouncementDto,
} from './announcement.dto';

@Injectable()
export class AnnouncementsService {
  constructor(
    @InjectRepository(Announcement)
    private readonly announcements: Repository<Announcement>,
  ) {}
  adminList() {
    return this.announcements.find({ order: { createdAt: 'DESC' } });
  }
  published() {
    return this.announcements.find({
      where: { publishedAt: Not(IsNull()) },
      order: { publishedAt: 'DESC' },
    });
  }
  create(dto: CreateAnnouncementDto) {
    return this.announcements.save(
      this.announcements.create({
        title: dto.title,
        body: dto.body,
        publishedAt: dto.published ? new Date() : null,
      }),
    );
  }
  async update(id: string, dto: UpdateAnnouncementDto) {
    const item = await this.announcements.findOneBy({ id });
    if (!item) throw new NotFoundException('Announcement not found');
    if (dto.title !== undefined) item.title = dto.title;
    if (dto.body !== undefined) item.body = dto.body;
    if (dto.published !== undefined)
      item.publishedAt = dto.published
        ? (item.publishedAt ?? new Date())
        : null;
    return this.announcements.save(item);
  }
  async remove(id: string) {
    const result = await this.announcements.delete(id);
    if (!result.affected) throw new NotFoundException('Announcement not found');
  }
}
