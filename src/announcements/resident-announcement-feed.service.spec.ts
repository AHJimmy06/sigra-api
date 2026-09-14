import { AnnouncementChange } from './announcement-change.entity';
import { AnnouncementChangeClock } from './announcement-change-clock.entity';
import {
  decodeAnnouncementCursor,
  encodeAnnouncementCursor,
} from './announcement-cursor';
import {
  AnnouncementFeedCursorError,
  ResidentAnnouncementFeedService,
} from './resident-announcement-feed.service';

const upsert = (position: string, title = `Notice ${position}`) =>
  ({
    position,
    announcementId: '11111111-1111-4111-8111-111111111111',
    kind: 'UPSERT',
    action: position === '1' ? 'PUBLISHED' : 'UPDATED',
    title,
    body: `Body ${position}`,
    publishedAt: new Date('2026-09-14T12:00:00.000Z'),
    authorDisplayName: 'Safe author',
    occurredAt: new Date(`2026-09-14T12:0${position}:00.000Z`),
  }) as AnnouncementChange;

const tombstone = (position = '3') =>
  ({
    position,
    announcementId: '22222222-2222-4222-8222-222222222222',
    kind: 'TOMBSTONE',
    action: 'ARCHIVED',
    title: null,
    body: null,
    publishedAt: null,
    authorDisplayName: null,
    occurredAt: new Date(`2026-09-14T12:0${position}:00.000Z`),
  }) as AnnouncementChange;

function createService(events: AnnouncementChange[], clock = '3') {
  const query = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue(events),
  };
  const manager = {
    getRepository: jest.fn((entity) =>
      entity === AnnouncementChangeClock
        ? {
            findOneByOrFail: jest
              .fn()
              .mockResolvedValue({ id: 1, value: clock }),
          }
        : { createQueryBuilder: jest.fn().mockReturnValue(query) },
    ),
    query: jest
      .fn()
      .mockResolvedValue([{ syncedAt: '2026-09-14T12:04:00.000Z' }]),
  };
  const dataSource = {
    transaction: jest.fn(
      async (
        isolation: 'REPEATABLE READ',
        work: (transactionManager: typeof manager) => Promise<unknown>,
      ) => {
        expect(isolation).toBe('REPEATABLE READ');
        return work(manager);
      },
    ),
  };

  return {
    service: new ResidentAnnouncementFeedService(dataSource as never),
    dataSource,
    manager,
    query,
  };
}

describe('resident announcement feed service', () => {
  it('returns a bounded stable page with a fixed high-watermark and safe projections', async () => {
    const { service, query, manager } = createService([
      upsert('2'),
      tombstone(),
    ]);

    const response = await service.getFeed({
      cursor: encodeAnnouncementCursor({ a: '1', h: '3' }),
      limit: 1,
    });

    expect(response).toEqual({
      items: [
        {
          position: '2',
          announcementId: '11111111-1111-4111-8111-111111111111',
          kind: 'UPSERT',
          action: 'UPDATED',
          title: 'Notice 2',
          body: 'Body 2',
          publishedAt: '2026-09-14T12:00:00.000Z',
          author: { name: 'Safe author' },
          occurredAt: '2026-09-14T12:02:00.000Z',
        },
      ],
      checkpoint: encodeAnnouncementCursor({ a: '3', h: '3' }),
      hasMore: true,
      nextCursor: encodeAnnouncementCursor({ a: '2', h: '3' }),
      syncedAt: '2026-09-14T12:04:00.000Z',
    });
    expect(query.where).toHaveBeenCalledWith(
      'change.position > :after AND change.position <= :high',
      { after: '1', high: '3' },
    );
    expect(query.orderBy).toHaveBeenCalledWith('change.position', 'ASC');
    expect(query.take).toHaveBeenCalledWith(2);
    expect(manager.query).toHaveBeenCalledWith(
      'SELECT clock_timestamp() AS "syncedAt"',
    );
  });

  it('rolls a consumed checkpoint to the current clock and preserves replay-safe ordering', async () => {
    const { service, query } = createService(
      [upsert('4'), tombstone('5')],
      '5',
    );
    const cursor = encodeAnnouncementCursor({ a: '3', h: '3' });

    const first = await service.getFeed({ cursor, limit: 2 });
    const replay = await service.getFeed({ cursor, limit: 2 });

    expect(first).toEqual(replay);
    expect(first.items).toEqual([
      expect.objectContaining({ position: '4', kind: 'UPSERT' }),
      {
        position: '5',
        announcementId: '22222222-2222-4222-8222-222222222222',
        kind: 'TOMBSTONE',
        action: 'ARCHIVED',
        occurredAt: '2026-09-14T12:05:00.000Z',
      },
    ]);
    expect(first.hasMore).toBe(false);
    expect(first.nextCursor).toBeUndefined();
    expect(decodeAnnouncementCursor(first.checkpoint)).toEqual({
      a: '5',
      h: '5',
    });
    expect(query.where).toHaveBeenLastCalledWith(
      'change.position > :after AND change.position <= :high',
      { after: '3', high: '5' },
    );
  });

  it('rejects future cursors and unsafe limits before querying changes', async () => {
    const { service, query } = createService([], '3');

    await expect(
      service.getFeed({
        cursor: encodeAnnouncementCursor({ a: '3', h: '4' }),
        limit: 1,
      }),
    ).rejects.toBeInstanceOf(AnnouncementFeedCursorError);
    await expect(service.getFeed({ limit: 101 })).rejects.toBeInstanceOf(
      AnnouncementFeedCursorError,
    );
    expect(query.getMany).not.toHaveBeenCalled();
  });

  it('rejects an explicit empty cursor while an omitted cursor starts synchronization', async () => {
    const { service, query } = createService([], '3');

    await service.getFeed({ limit: 1 });

    expect(query.where).toHaveBeenCalledWith(
      'change.position > :after AND change.position <= :high',
      { after: '0', high: '3' },
    );
    await expect(
      service.getFeed({ cursor: '', limit: 1 }),
    ).rejects.toBeInstanceOf(AnnouncementFeedCursorError);
  });
});
