import { Reflector } from '@nestjs/core';
import { Role } from '../common/role.enum';
import { ROLES_KEY } from '../common/roles.decorator';
import { CursorInvalidException } from '../common/http/http-error.contract';
import {
  AnnouncementFeedCursorError,
  ResidentAnnouncementFeedService,
} from './resident-announcement-feed.service';
import { ResidentAnnouncementsController } from './resident-announcements.controller';
import { ResidentAnnouncementQueryDto } from './resident-announcement.dto';

describe('ResidentAnnouncementsController', () => {
  let controller: ResidentAnnouncementsController;
  let feedService: { getFeed: jest.Mock };

  beforeEach(() => {
    feedService = {
      getFeed: jest.fn(),
    };
    controller = new ResidentAnnouncementsController(
      feedService as unknown as ResidentAnnouncementFeedService,
    );
  });

  it('delegates feed retrieval to ResidentAnnouncementFeedService with query params', async () => {
    const mockFeed = {
      items: [
        {
          position: '1',
          announcementId: '11111111-1111-4111-8111-111111111111',
          kind: 'UPSERT',
          action: 'PUBLISHED',
          title: 'Notice title',
          body: 'Notice full body text',
          publishedAt: '2026-09-15T00:00:00.000Z',
          author: { name: 'Admin User' },
          occurredAt: '2026-09-15T00:00:00.000Z',
        },
      ],
      checkpoint: 'checkpoint-cursor',
      hasMore: false,
      syncedAt: '2026-09-15T00:00:00.000Z',
    };
    feedService.getFeed.mockResolvedValue(mockFeed);

    const query: ResidentAnnouncementQueryDto = {
      cursor: 'test-cursor',
      limit: 10,
    };

    const result = await controller.getFeed(query);

    expect(feedService.getFeed).toHaveBeenCalledWith({
      cursor: 'test-cursor',
      limit: 10,
    });
    expect(result).toBe(mockFeed);
  });

  it('translates AnnouncementFeedCursorError into CursorInvalidException', async () => {
    feedService.getFeed.mockRejectedValue(
      new AnnouncementFeedCursorError('Announcement feed cursor is invalid'),
    );

    await expect(
      controller.getFeed({ cursor: 'invalid-cursor' }),
    ).rejects.toThrow(CursorInvalidException);
  });

  it('restricts access exclusively to the RESIDENT role', () => {
    const reflector = new Reflector();
    const roles = reflector.get<Role[]>(
      ROLES_KEY,
      ResidentAnnouncementsController.prototype.getFeed,
    );
    expect(roles).toEqual([Role.RESIDENT]);
  });
});
