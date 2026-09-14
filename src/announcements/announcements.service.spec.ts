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
  it('snapshots the creator and records ordered create and publication audits', async () => {
    const saved = {
      id: 'announcement-1',
      title: 'Notice title',
      body: 'A sufficiently long announcement body',
      status: AnnouncementStatus.PUBLISHED,
      publishedAt: new Date('2026-09-13T10:00:00.000Z'),
      authorIdSnapshot: actor.sub,
      authorDisplayNameSnapshot: 'Admin',
      authorEmailSnapshot: actor.email,
      createdAt: new Date('2026-09-13T10:00:00.000Z'),
      updatedAt: new Date('2026-09-13T10:00:00.000Z'),
    } as Announcement;
    const announcements = {
      create: jest.fn((value) => value),
      save: jest.fn().mockResolvedValue(saved),
    };
    const users = {
      findOneByOrFail: jest.fn().mockResolvedValue({
        id: actor.sub,
        displayName: 'Admin',
        email: ' ADMIN@EXAMPLE.COM ',
      }),
    };
    const manager = {
      getRepository: jest.fn((entity) =>
        entity === Announcement ? announcements : users,
      ),
    };
    const audit = { record: jest.fn().mockResolvedValue(undefined) };
    const service = new AnnouncementsService(
      {} as never,
      { transaction: jest.fn((work) => work(manager)) } as never,
      audit,
    );

    await expect(
      service.create(
        { title: saved.title, body: saved.body, published: true },
        actor,
      ),
    ).resolves.toMatchObject({ authorId: actor.sub });
    expect(announcements.create).toHaveBeenCalledWith(
      expect.objectContaining({
        authorIdSnapshot: actor.sub,
        authorDisplayNameSnapshot: 'Admin',
        authorEmailSnapshot: 'admin@example.com',
      }),
    );
    expect(audit.record.mock.calls.map(([, event]) => event.action)).toEqual([
      'ANNOUNCEMENT_CREATED',
      'ANNOUNCEMENT_PUBLISHED',
    ]);
  });

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

  it('sets publishedAt when publishing and preserves it on unrelated edits', async () => {
    const publishedAt = new Date('2026-09-07T12:00:00.000Z');
    const announcement = {
      id: 'announcement-1',
      title: 'Original title',
      body: 'Original announcement body',
      publishedAt,
      status: AnnouncementStatus.PUBLISHED,
      authorIdSnapshot: 'admin-1',
      authorDisplayNameSnapshot: null,
      authorEmailSnapshot: 'admin@example.com',
      createdAt: publishedAt,
      updatedAt: publishedAt,
    } as Announcement;
    const repository = {
      findOne: jest.fn().mockResolvedValue(announcement),
      save: jest.fn((value: Announcement) => Promise.resolve(value)),
    };
    const manager = { getRepository: jest.fn().mockReturnValue(repository) };
    const dataSource = {
      transaction: jest.fn((work: (value: typeof manager) => unknown) =>
        work(manager),
      ),
    };
    const audit = { record: jest.fn().mockResolvedValue(undefined) };
    const service = new AnnouncementsService(
      {} as never,
      dataSource as never,
      audit,
    );

    const updated = await service.update(
      announcement.id,
      { kind: 'CONTENT', title: 'Updated title' },
      actor,
    );
    expect(updated.publishedAt).toBe(publishedAt.toISOString());
    expect(audit.record).toHaveBeenCalledWith(
      manager,
      expect.objectContaining({ action: 'ANNOUNCEMENT_UPDATED' }),
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
