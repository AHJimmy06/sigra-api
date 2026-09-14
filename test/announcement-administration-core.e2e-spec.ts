/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
import { randomUUID } from 'node:crypto';
import { Role } from '../src/common/role.enum';
import { startAnnouncementAdministrationHttpHarness } from './support/announcement-administration-http-harness';

describe('Announcement administration HTTP proof', () => {
  it('enforces the ADMIN authorization matrix without writes', async () => {
    const api =
      await startAnnouncementAdministrationHttpHarness('announcement-auth');
    try {
      const resident = await api.seedUser(
        'resident@example.test',
        Role.RESIDENT,
      );
      const residentToken = await api.tokenFor(resident);
      const existing = await api.seedAnnouncement({
        title: 'Protected notice',
        body: 'This announcement is protected.',
      });
      const requests = [
        (client: ReturnType<typeof api.authorized>) =>
          client.get('/api/announcements'),
        (client: ReturnType<typeof api.authorized>) =>
          client.get(`/api/announcements/${existing.id}`),
        (client: ReturnType<typeof api.authorized>) =>
          client
            .post('/api/announcements')
            .send({ title: 'New notice', body: 'A valid new announcement.' }),
        (client: ReturnType<typeof api.authorized>) =>
          client
            .patch(`/api/announcements/${existing.id}`)
            .send({ title: 'Updated notice' }),
        (client: ReturnType<typeof api.authorized>) =>
          client.post(`/api/announcements/${existing.id}/archive`),
      ];
      const before = await api.persistenceSnapshot(existing.id);
      for (const makeRequest of requests) {
        expect((await makeRequest(api.anonymous())).status).toBe(401);
      }
      for (const makeRequest of requests) {
        const response = await makeRequest(api.authorized(residentToken));
        expect(response.status).toBe(403);
      }
      expect(await api.persistenceSnapshot(existing.id)).toEqual(before);
    } finally {
      await api.close();
    }
  }, 120000);

  it('creates immutable snapshot responses and lists deterministic filtered pages', async () => {
    const api =
      await startAnnouncementAdministrationHttpHarness('announcement-read');
    try {
      const created = await api
        .authorized()
        .post('/api/announcements')
        .send({
          title: 'Snapshot notice',
          body: 'A complete announcement body for snapshots.',
          published: true,
        })
        .expect(201);
      const createdId = created.body.id as string;
      expect(Object.keys(created.body).sort()).toEqual([
        'author',
        'authorId',
        'body',
        'createdAt',
        'id',
        'publishedAt',
        'status',
        'title',
        'updatedAt',
      ]);
      expect(created.body).toMatchObject({
        status: 'PUBLISHED',
        authorId: api.adminId,
        author: { id: api.adminId, name: 'Admin', email: 'admin@example.test' },
      });
      expect(new Date(created.body.createdAt).toISOString()).toBe(
        created.body.createdAt,
      );
      const reader = await api.seedUser(
        'reader@example.test',
        Role.ADMIN,
        'Reader',
      );
      const readerToken = await api.tokenFor(reader);
      await api.dataSource.query(
        'DELETE FROM audit_logs WHERE actor_user_id = $1',
        [api.adminId],
      );
      await api.dataSource.query('DELETE FROM users WHERE id = $1', [
        api.adminId,
      ]);
      const detail = await api
        .authorized(readerToken)
        .get(`/api/announcements/${createdId}`)
        .expect(200);
      expect(detail.body.author).toEqual({
        id: api.adminId,
        name: 'Admin',
        email: 'admin@example.test',
      });

      const older = await api.seedAnnouncement({
        title: 'Search oldest',
        body: 'Search announcement body one.',
      });
      const newer = await api.seedAnnouncement({
        title: 'Search newest',
        body: 'Search announcement body two.',
        status: 'PUBLISHED',
      });
      const archived = await api.seedAnnouncement({
        title: 'Search archived',
        body: 'Search announcement body three.',
        status: 'ARCHIVED',
      });
      await api.dataSource.query(
        'UPDATE announcements SET updated_at = $1 WHERE id = ANY($2)',
        ['2026-01-01T00:00:00.000Z', [older.id, newer.id, archived.id]],
      );
      const defaultList = await api
        .authorized(readerToken)
        .get('/api/announcements?search=search&page=1&pageSize=1')
        .expect(200);
      const pageTwo = await api
        .authorized(readerToken)
        .get('/api/announcements?search=search&page=2&pageSize=1')
        .expect(200);
      expect(defaultList.body.total).toBe(2);
      expect([defaultList.body.items[0].id, pageTwo.body.items[0].id]).toEqual(
        [older.id, newer.id].sort().reverse(),
      );
      const archivedList = await api
        .authorized(readerToken)
        .get('/api/announcements?search=search&status=ARCHIVED')
        .expect(200);
      expect(
        archivedList.body.items.map((item: { id: string }) => item.id),
      ).toEqual([archived.id]);
      const archivedDetail = await api
        .authorized(readerToken)
        .get(`/api/announcements/${archived.id}`)
        .expect(200);
      expect(Object.keys(archivedDetail.body).sort()).toEqual([
        'author',
        'authorId',
        'body',
        'createdAt',
        'id',
        'publishedAt',
        'status',
        'title',
        'updatedAt',
      ]);
      expect(archivedDetail.body).toMatchObject({
        id: archived.id,
        title: 'Search archived',
        body: 'Search announcement body three.',
        status: 'ARCHIVED',
        authorId: reader.id,
        author: {
          id: reader.id,
          name: 'Reader',
          email: 'reader@example.test',
        },
      });
      expect(new Date(archivedDetail.body.createdAt).toISOString()).toBe(
        archivedDetail.body.createdAt,
      );
      expect(new Date(archivedDetail.body.updatedAt).toISOString()).toBe(
        archivedDetail.body.updatedAt,
      );
      expect(new Date(archivedDetail.body.publishedAt).toISOString()).toBe(
        archivedDetail.body.publishedAt,
      );
      await api
        .authorized(readerToken)
        .get(`/api/announcements/${randomUUID()}`)
        .expect(404);
    } finally {
      await api.close();
    }
  }, 120000);

  it('rejects malformed requests with Phase 0 envelopes and zero persistence changes', async () => {
    const api = await startAnnouncementAdministrationHttpHarness(
      'announcement-validation',
    );
    try {
      const existing = await api.seedAnnouncement({
        title: 'Validation notice',
        body: 'A body that remains unchanged.',
      });
      const invalid = [
        () =>
          api
            .authorized()
            .post('/api/announcements')
            .send({ title: 'bad', body: 'short' }),
        () =>
          api
            .authorized()
            .post('/api/announcements')
            .send({ title: ' '.repeat(5), body: ' '.repeat(10) }),
        () =>
          api
            .authorized()
            .post('/api/announcements')
            .send({
              title: 'a'.repeat(161),
              body: 'A valid announcement body.',
              forbidden: true,
            }),
        () => api.authorized().get('/api/announcements?page=0'),
        () =>
          api
            .authorized()
            .get(
              '/api/announcements?page=one&pageSize=0&search=' +
                'a'.repeat(161),
            ),
        () => api.authorized().get('/api/announcements?status=UNKNOWN'),
        () => api.authorized().get('/api/announcements?pageSize=101'),
        () =>
          api
            .authorized()
            .get(`/api/announcements/${randomUUID().replace(/-/gu, '')}`),
        () =>
          api.authorized().patch(`/api/announcements/${existing.id}`).send({}),
        () =>
          api
            .authorized()
            .patch(`/api/announcements/${existing.id}`)
            .send({ unknown: true }),
        () =>
          api
            .authorized()
            .patch(`/api/announcements/${existing.id}`)
            .send({ title: 'Valid title', published: true }),
        () =>
          api
            .authorized()
            .patch(`/api/announcements/${existing.id}`)
            .send({ title: 'bad' }),
        () =>
          api
            .authorized()
            .patch(`/api/announcements/${randomUUID().replace(/-/gu, '')}`)
            .send({ title: 'Valid title' }),
        () =>
          api
            .authorized()
            .post(
              `/api/announcements/${randomUUID().replace(/-/gu, '')}/archive`,
            ),
      ];
      const before = await api.persistenceSnapshot(existing.id);
      for (const request of invalid) {
        const response = await request();
        expect(response.status).toBe(400);
        expect(response.body).toEqual(
          expect.objectContaining({
            code: expect.any(String),
            message: expect.any(String),
            details: expect.any(Object),
            requestId: expect.any(String),
          }),
        );
        expect(await api.persistenceSnapshot(existing.id)).toEqual(before);
      }
    } finally {
      await api.close();
    }
  }, 120000);

  it('records exact safe audits and leaves content no-ops write-free', async () => {
    const api = await startAnnouncementAdministrationHttpHarness(
      'announcement-content',
    );
    try {
      const created = await api
        .authorized()
        .post('/api/announcements')
        .send({
          title: 'Immediate publication',
          body: 'This announcement publishes immediately.',
          published: true,
        })
        .expect(201);
      const id = created.body.id as string;
      expect(await api.auditRows(id)).toEqual([
        expect.objectContaining({
          action: 'ANNOUNCEMENT_CREATED',
          metadata: {},
        }),
        expect.objectContaining({
          action: 'ANNOUNCEMENT_PUBLISHED',
          metadata: { status: { from: 'DRAFT', to: 'PUBLISHED' } },
        }),
      ]);
      const beforeNoop = await api.persistenceSnapshot(id);
      await api
        .authorized()
        .patch(`/api/announcements/${id}`)
        .send({ title: created.body.title })
        .expect(200);
      expect(await api.persistenceSnapshot(id)).toEqual(beforeNoop);
      await api
        .authorized()
        .patch(`/api/announcements/${id}`)
        .send({
          title: 'Changed announcement title',
          body: 'This changed announcement body is still valid.',
        })
        .expect(200);
      const audits = await api.auditRows(id);
      expect(audits).toHaveLength(3);
      expect(audits[2]).toMatchObject({
        action: 'ANNOUNCEMENT_UPDATED',
        metadata: { changedFields: ['body', 'title'] },
      });
      expect(JSON.stringify(audits[2])).not.toMatch(
        /Changed announcement|valid\.|email|password/i,
      );
    } finally {
      await api.close();
    }
  }, 120000);
});
