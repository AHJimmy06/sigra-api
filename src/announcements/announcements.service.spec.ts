/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return */
import { Role } from '../common/role.enum';
import { Announcement, AnnouncementStatus } from './announcement.entity';
import { AnnouncementsService } from './announcements.service';

const actor = {
  sub: 'admin-1',
  email: 'admin@example.com',
  role: Role.ADMIN,
  residentId: null,
};

describe('AnnouncementsService', () => {
  it('excludes archived announcements by default and maps detail from snapshots', async () => {
    const announcement = {
      id: 'announcement-1',
      title: 'Notice title',
      body: 'A long enough announcement body',
      status: AnnouncementStatus.DRAFT,
      publishedAt: null,
      authorIdSnapshot: 'admin-1',
      authorDisplayNameSnapshot: null,
      authorEmailSnapshot: 'admin@example.com',
      createdAt: new Date('2026-09-12T10:00:00.000Z'),
      updatedAt: new Date('2026-09-12T10:00:00.000Z'),
    } as Announcement;
    const query = {
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getCount: jest.fn().mockResolvedValue(0),
      getRawAndEntities: jest.fn().mockResolvedValue({ raw: [], entities: [] }),
    };
    const service = new AnnouncementsService(
      {
        createQueryBuilder: jest.fn().mockReturnValue(query),
        findOneBy: jest.fn().mockResolvedValue(announcement),
      } as never,
      {} as never,
      {} as never,
    );

    await expect(service.findOne(announcement.id)).resolves.toMatchObject({
      authorId: 'admin-1',
      author: { name: null, email: 'admin@example.com' },
    });
    await service.list({ page: 1, pageSize: 10 });
    expect(query.andWhere).toHaveBeenCalledWith(
      'announcement.status <> :archivedStatus',
      { archivedStatus: AnnouncementStatus.ARCHIVED },
    );
    expect(query.orderBy).toHaveBeenCalledWith(
      'announcement.updatedAt',
      'DESC',
    );
  });

  it('uses requested admin filters and explicit archived access', async () => {
    const createQuery = () => ({
      leftJoin: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getCount: jest.fn().mockResolvedValue(0),
      getRawAndEntities: jest.fn().mockResolvedValue({ raw: [], entities: [] }),
    });
    const draftQuery = createQuery();
    const archivedQuery = createQuery();
    const repository = {
      createQueryBuilder: jest
        .fn()
        .mockReturnValueOnce(draftQuery)
        .mockReturnValueOnce(archivedQuery),
    };
    const service = new AnnouncementsService(
      repository as never,
      {} as never,
      {} as never,
    );

    await service.list({
      page: 1,
      pageSize: 10,
      status: AnnouncementStatus.DRAFT,
    });
    await service.list({
      page: 1,
      pageSize: 10,
      status: AnnouncementStatus.ARCHIVED,
    });

    expect(draftQuery.andWhere).toHaveBeenCalledWith(
      'announcement.status = :status',
      { status: AnnouncementStatus.DRAFT },
    );
    expect(archivedQuery.andWhere).toHaveBeenCalledWith(
      'announcement.status = :status',
      { status: AnnouncementStatus.ARCHIVED },
    );
  });

  it('returns the observable author shape without exposing the user entity', async () => {
    const announcement = {
      id: 'announcement-1',
      authorIdSnapshot: 'admin-1',
      authorDisplayNameSnapshot: null,
      authorEmailSnapshot: 'admin@example.com',
      createdAt: new Date('2026-09-12T10:00:00.000Z'),
      updatedAt: new Date('2026-09-12T10:00:00.000Z'),
    } as Announcement;
    const query = {
      leftJoin: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getCount: jest.fn().mockResolvedValue(1),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getRawAndEntities: jest.fn().mockResolvedValue({
        entities: [announcement],
        raw: [{ password_hash: 'secret' }],
      }),
    };
    const service = new AnnouncementsService(
      { createQueryBuilder: jest.fn().mockReturnValue(query) } as never,
      {} as never,
      {} as never,
    );

    const result = await service.list({ page: 1, pageSize: 10 });

    expect(result.items[0]).toMatchObject({
      author: {
        id: 'admin-1',
        name: null,
        email: 'admin@example.com',
      },
    });
    expect(JSON.stringify(result)).not.toContain('password_hash');
  });

});
