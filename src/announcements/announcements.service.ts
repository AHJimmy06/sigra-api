import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Announcement } from './announcement.entity';
import {
  CreateAnnouncementDto,
  UpdateAnnouncementDto,
} from './announcement.dto';

@Injectable()
export class AnnouncementsService {
  constructor(
    @InjectRepository(Announcement)
    private readonly announcementRepository: Repository<Announcement>,
  ) {}

  async list(params: {
    page: number;
    pageSize: number;
    search?: string;
    status?: string;
  }) {
    const { page, pageSize, search, status } = params;
    const query =
      this.announcementRepository.createQueryBuilder('announcement');

    if (search) {
      query.andWhere(
        '(announcement.title ILIKE :search OR announcement.body ILIKE :search)',
        {
          search: `%${search}%`,
        },
      );
    }

    if (status !== undefined) {
      query.andWhere('announcement.published = :status', {
        status: status === 'true',
      });
    }

    query.skip((page - 1) * pageSize).take(pageSize);
    query.orderBy('announcement.createdAt', 'DESC');

    const [items, total] = await query.getManyAndCount();

    return {
      items,
      total,
      page,
      pageSize,
    };
  }

  async create(dto: CreateAnnouncementDto) {
    const announcement = this.announcementRepository.create(dto);
    return await this.announcementRepository.save(announcement);
  }

  async update(id: string, dto: UpdateAnnouncementDto) {
    const announcement = await this.announcementRepository.findOne({
      where: { id },
    });
    if (!announcement) {
      throw new NotFoundException('Announcement not found.');
    }
    Object.assign(announcement, dto);
    return await this.announcementRepository.save(announcement);
  }

  async remove(id: string) {
    const announcement = await this.announcementRepository.findOne({
      where: { id },
    });
    if (!announcement) {
      throw new NotFoundException('Announcement not found.');
    }
    await this.announcementRepository.remove(announcement);
  }
}
