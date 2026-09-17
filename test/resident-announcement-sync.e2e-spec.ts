/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
import { Role } from '../src/common/role.enum';
import { startAnnouncementAdministrationHttpHarness } from './support/announcement-administration-http-harness';

describe('Resident announcement sync HTTP proof', () => {
  it('enforces RESIDENT-only authorization, parameter validation, cursor pagination, and tombstone sync', async () => {
    const api =
      await startAnnouncementAdministrationHttpHarness('resident-sync');
    try {
      const resident = await api.seedUser(
        'resident@example.test',
        Role.RESIDENT,
        'Resident Tester',
      );
      const residentToken = await api.tokenFor(resident);

      // 1. Authorization: anonymous -> 401, admin -> 403, resident -> 200
      await api.anonymous().get('/api/resident/announcements').expect(401);
      await api
        .authorized()
        .get('/api/resident/announcements')
        .expect(403);

      const initialEmpty = await api
        .authorized(residentToken)
        .get('/api/resident/announcements')
        .expect(200);

      expect(initialEmpty.body).toMatchObject({
        items: [],
        checkpoint: expect.any(String),
        hasMore: false,
        syncedAt: expect.any(String),
      });

      // 2. Query validation: invalid limit bounds, types, and extra properties
      const invalidLimitMin = await api
        .authorized(residentToken)
        .get('/api/resident/announcements?limit=0')
        .expect(400);
      expect(invalidLimitMin.body).toMatchObject({
        code: 'VALIDATION_ERROR',
        details: { limit: expect.any(Array) },
      });

      const invalidLimitMax = await api
        .authorized(residentToken)
        .get('/api/resident/announcements?limit=101')
        .expect(400);
      expect(invalidLimitMax.body).toMatchObject({
        code: 'VALIDATION_ERROR',
        details: { limit: expect.any(Array) },
      });

      const invalidProperty = await api
        .authorized(residentToken)
        .get('/api/resident/announcements?unexpected=value')
        .expect(400);
      expect(invalidProperty.body).toMatchObject({
        code: 'VALIDATION_ERROR',
      });

      // 3. Cursor validation: malformed or future cursor -> 400 CURSOR_INVALID
      const invalidCursor = await api
        .authorized(residentToken)
        .get('/api/resident/announcements?cursor=malformed_cursor_value')
        .expect(400);
      expect(invalidCursor.body).toMatchObject({
        code: 'CURSOR_INVALID',
      });

      // 4. Drafts must NOT be returned, Published must be returned as UPSERT
      await api
        .authorized()
        .post('/api/announcements')
        .send({
          title: 'Draft announcement title',
          body: 'This draft body must not be visible to residents.',
          published: false,
        })
        .expect(201);

      const publishedRes1 = await api
        .authorized()
        .post('/api/announcements')
        .send({
          title: 'First published notice',
          body: 'Body content for the first published notice.',
          published: true,
        })
        .expect(201);
      const id1 = publishedRes1.body.id as string;

      const publishedRes2 = await api
        .authorized()
        .post('/api/announcements')
        .send({
          title: 'Second published notice',
          body: 'Body content for the second published notice.',
          published: true,
        })
        .expect(201);
      const id2 = publishedRes2.body.id as string;

      // Resident requests first page with limit=1
      const page1 = await api
        .authorized(residentToken)
        .get('/api/resident/announcements?limit=1')
        .expect(200);

      expect(page1.body.items).toHaveLength(1);
      expect(page1.body.items[0]).toMatchObject({
        announcementId: id1,
        kind: 'UPSERT',
        action: 'PUBLISHED',
        title: 'First published notice',
        body: 'Body content for the first published notice.',
        author: { name: expect.any(String) },
      });
      // Ensure internal authorId / email snapshot do not leak
      expect(page1.body.items[0].authorId).toBeUndefined();
      expect(page1.body.items[0].authorEmail).toBeUndefined();
      expect(page1.body.hasMore).toBe(true);
      expect(page1.body.nextCursor).toBeDefined();

      // Page 2 using nextCursor
      const page2 = await api
        .authorized(residentToken)
        .get(`/api/resident/announcements?cursor=${page1.body.nextCursor}&limit=1`)
        .expect(200);

      expect(page2.body.items).toHaveLength(1);
      expect(page2.body.items[0]).toMatchObject({
        announcementId: id2,
        kind: 'UPSERT',
        action: 'PUBLISHED',
        title: 'Second published notice',
      });
      expect(page2.body.hasMore).toBe(false);

      // Replay idempotency
      const page2Replay = await api
        .authorized(residentToken)
        .get(`/api/resident/announcements?cursor=${page1.body.nextCursor}&limit=1`)
        .expect(200);
      expect(page2Replay.body.items).toEqual(page2.body.items);

      // 5. Withdrawal / Tombstone handling
      await api
        .authorized()
        .patch(`/api/announcements/${id1}`)
        .send({ published: false })
        .expect(200);

      const tombstonePage = await api
        .authorized(residentToken)
        .get(`/api/resident/announcements?cursor=${page2.body.checkpoint}`)
        .expect(200);

      expect(tombstonePage.body.items).toHaveLength(1);
      expect(tombstonePage.body.items[0]).toMatchObject({
        announcementId: id1,
        kind: 'TOMBSTONE',
        action: 'WITHDRAWN',
      });
      expect(tombstonePage.body.items[0].body).toBeUndefined();
      expect(tombstonePage.body.items[0].title).toBeUndefined();
    } finally {
      await api.close();
    }
  }, 120000);
});
