import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { Announcement } from './announcement.entity';
import { AnnouncementChange } from './announcement-change.entity';
import { AnnouncementChangeClock } from './announcement-change-clock.entity';
import { AnnouncementsController } from './announcements.controller';
import { AnnouncementsService } from './announcements.service';
import { ResidentAnnouncementFeedService } from './resident-announcement-feed.service';
import { ResidentAnnouncementsController } from './resident-announcements.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Announcement,
      AnnouncementChange,
      AnnouncementChangeClock,
    ]),
    AuthModule,
  ],
  controllers: [AnnouncementsController, ResidentAnnouncementsController],
  providers: [AnnouncementsService, ResidentAnnouncementFeedService],
})
export class AnnouncementsModule {}
