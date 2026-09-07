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
  it('sets publishedAt when publishing and preserves it on unrelated edits', async () => {
    const publishedAt = new Date('2026-09-07T12:00:00.000Z');
    const announcement = {
      id: 'announcement-1',
      title: 'Original title',
      body: 'Original announcement body',
      publishedAt,
      status: AnnouncementStatus.PUBLISHED,
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
      { title: 'Updated title' },
      actor,
    );
    expect(updated.publishedAt).toBe(publishedAt);
    expect(audit.record).toHaveBeenCalledWith(
      manager,
      expect.objectContaining({ action: 'ANNOUNCEMENT_UPDATED' }),
    );
  });

  it('preserves original publishedAt and changes explicit state on withdrawal', async () => {
    const publishedAt = new Date('2026-09-07T12:00:00.000Z');
    const announcement = {
      id: 'announcement-1',
      publishedAt,
      status: AnnouncementStatus.PUBLISHED,
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

    await expect(
      service.update(announcement.id, { published: false }, actor),
    ).resolves.toMatchObject({
      publishedAt,
      status: AnnouncementStatus.DRAFT,
    });
    expect(audit.record).toHaveBeenCalledWith(
      manager,
      expect.objectContaining({ action: 'ANNOUNCEMENT_WITHDRAWN' }),
    );
  });

  it('forces resident lists to published state and keeps admin filtering', async () => {
    const createQuery = () => ({
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    });
    const residentQuery = createQuery();
    const adminQuery = createQuery();
    const repository = {
      createQueryBuilder: jest
        .fn()
        .mockReturnValueOnce(residentQuery)
        .mockReturnValueOnce(adminQuery),
    };
    const service = new AnnouncementsService(
      repository as never,
      {} as never,
      {} as never,
    );

    await service.list(
      { page: 1, pageSize: 10, status: AnnouncementStatus.DRAFT },
      { ...actor, role: Role.RESIDENT, residentId: 'resident-1' },
    );
    await service.list(
      { page: 1, pageSize: 10, status: AnnouncementStatus.ARCHIVED },
      actor,
    );

    expect(residentQuery.andWhere).toHaveBeenCalledWith(
      'announcement.status = :residentStatus',
      { residentStatus: AnnouncementStatus.PUBLISHED },
    );
    expect(adminQuery.andWhere).toHaveBeenCalledWith(
      'announcement.status = :status',
      { status: AnnouncementStatus.ARCHIVED },
    );
  });
});
