import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Role } from '../common/role.enum';
import { Roles } from '../common/roles.decorator';
import { RolesGuard } from '../common/roles.guard';
import { CursorInvalidException } from '../common/http/http-error.contract';
import {
  AnnouncementFeedCursorError,
  ResidentAnnouncementFeedService,
} from './resident-announcement-feed.service';
import {
  ResidentAnnouncementFeedResponseDto,
  ResidentAnnouncementQueryDto,
} from './resident-announcement.dto';

@ApiTags('resident-announcements')
@Controller('resident/announcements')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ResidentAnnouncementsController {
  constructor(
    private readonly feedService: ResidentAnnouncementFeedService,
  ) {}

  @Get()
  @Roles(Role.RESIDENT)
  @ApiOkResponse({ type: ResidentAnnouncementFeedResponseDto })
  async getFeed(
    @Query() query: ResidentAnnouncementQueryDto,
  ): Promise<ResidentAnnouncementFeedResponseDto> {
    try {
      return (await this.feedService.getFeed({
        cursor: query.cursor,
        limit: query.limit,
      })) as ResidentAnnouncementFeedResponseDto;
    } catch (error) {
      if (error instanceof AnnouncementFeedCursorError) {
        throw new CursorInvalidException(error.message);
      }
      throw error;
    }
  }
}
