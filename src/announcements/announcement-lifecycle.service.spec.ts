import { Role } from '../common/role.enum';
import { Announcement, AnnouncementStatus } from './announcement.entity';
import { AnnouncementChange } from './announcement-change.entity';
import { AnnouncementChangeClock } from './announcement-change-clock.entity';
import { AnnouncementsService } from './announcements.service';

const actor = {
  sub: 'admin-1',
  email: 'admin@example.test',
  role: Role.ADMIN,
  residentId: null,
};

describe('announcement lifecycle change writer', () => {
  it('writes one published UPSERT after create audits in the same transaction', async () => {
    const announcement = {
      id: '11111111-1111-4111-8111-111111111111',
      title: 'Published notice',
      body: 'A complete published body.',
      status: AnnouncementStatus.PUBLISHED,
      publishedAt: new Date('2026-09-14T12:00:00.000Z'),
      authorDisplayNameSnapshot: 'Admin',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as Announcement;
    const announcements = {
      create: jest.fn((value: object) => value),
      save: jest.fn().mockResolvedValue(announcement),
    };
    const clock = {
      findOne: jest.fn().mockResolvedValue({ id: 1, value: '0' }),
      save: jest.fn((value: AnnouncementChangeClock) => value),
    };
    const changes = {
      create: jest.fn((value: object) => value),
      save: jest.fn().mockResolvedValue(undefined),
    };
    const manager = {
      getRepository: jest.fn((entity) =>
        entity === Announcement
          ? announcements
          : entity === AnnouncementChangeClock
            ? clock
            : entity === AnnouncementChange
              ? changes
              : {
                  findOneByOrFail: jest.fn().mockResolvedValue({
                    id: actor.sub,
                    displayName: 'Admin',
                    email: actor.email,
                  }),
                },
      ),
    };
    const audit = { record: jest.fn().mockResolvedValue(undefined) };
    const service = new AnnouncementsService(
      {} as never,
      {
        transaction: jest.fn(
          async (work: (entityManager: typeof manager) => Promise<unknown>) =>
            work(manager),
        ),
      } as never,
      audit,
    );

    await service.create(
      { title: announcement.title, body: announcement.body, published: true },
      actor,
    );

    expect(changes.save).toHaveBeenCalledWith(
      expect.objectContaining({
        position: '1',
        kind: 'UPSERT',
        action: 'PUBLISHED',
        body: announcement.body,
      }),
    );
    expect(clock.findOne).toHaveBeenCalledWith({
      where: { id: 1 },
      lock: { mode: 'pessimistic_write' },
    });
  });
});
