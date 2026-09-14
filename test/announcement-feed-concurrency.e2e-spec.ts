import { ResidentAnnouncementFeedService } from '../src/announcements/resident-announcement-feed.service';
import { startAnnouncementAdministrationHttpHarness } from './support/announcement-administration-http-harness';

describe('Resident announcement feed concurrency proof', () => {
  it('keeps an in-progress page bounded while a newly committed publication is read by the next checkpoint', async () => {
    const api =
      await startAnnouncementAdministrationHttpHarness('announce-feed');
    try {
      const feed = api.app.get(ResidentAnnouncementFeedService);
      await Promise.all(
        ['one', 'two'].map((suffix) =>
          api
            .authorized()
            .post('/api/announcements')
            .send({
              title: `Concurrent ${suffix} notice`,
              body: `A complete published body for concurrent ${suffix}.`,
              published: true,
            })
            .expect(201),
        ),
      );

      const first = await feed.getFeed({ limit: 1 });
      await api
        .authorized()
        .post('/api/announcements')
        .send({
          title: 'Later concurrent notice',
          body: 'A complete published body after the first feed page.',
          published: true,
        })
        .expect(201);
      const second = await feed.getFeed({ cursor: first.nextCursor, limit: 1 });
      const replay = await feed.getFeed({ cursor: first.nextCursor, limit: 1 });
      const afterCheckpoint = await feed.getFeed({
        cursor: first.checkpoint,
        limit: 1,
      });

      expect(first.items.map((item) => item.position)).toEqual(['1']);
      expect(first.hasMore).toBe(true);
      expect(first.nextCursor).toBeDefined();
      expect(second.items.map((item) => item.position)).toEqual(['2']);
      expect(second.hasMore).toBe(false);
      expect(replay.items).toEqual(second.items);
      expect(replay.checkpoint).toBe(second.checkpoint);
      expect(replay.nextCursor).toBe(second.nextCursor);
      expect(afterCheckpoint.items.map((item) => item.position)).toEqual(['3']);
      expect(afterCheckpoint.items[0]).toMatchObject({
        kind: 'UPSERT',
        action: 'PUBLISHED',
        title: 'Later concurrent notice',
      });
    } finally {
      await api.close();
    }
  }, 120000);
});
