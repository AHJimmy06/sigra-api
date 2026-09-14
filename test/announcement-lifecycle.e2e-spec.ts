/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
import { startAnnouncementAdministrationHttpHarness } from './support/announcement-administration-http-harness';

describe('Announcement lifecycle HTTP proof', () => {
  it('enforces legal, null, terminal, and write-free lifecycle transitions', async () => {
    const api =
      await startAnnouncementAdministrationHttpHarness('announcement-life');
    try {
      const created = await api
        .authorized()
        .post('/api/announcements')
        .send({
          title: 'Lifecycle notice',
          body: 'A complete body used for lifecycle proof.',
        })
        .expect(201);
      const id = created.body.id as string;
      const beforePublish = await api.persistenceSnapshot(id);
      await api
        .authorized()
        .patch(`/api/announcements/${id}`)
        .send({ published: false })
        .expect(200);
      expect(await api.persistenceSnapshot(id)).toEqual(beforePublish);
      const published = await api
        .authorized()
        .patch(`/api/announcements/${id}`)
        .send({ published: true })
        .expect(200);
      expect(published.body).toMatchObject({
        status: 'PUBLISHED',
        publishedAt: expect.any(String),
      });
      const firstPublishedAt = published.body.publishedAt;
      const beforePublishedNoop = await api.persistenceSnapshot(id);
      await api
        .authorized()
        .patch(`/api/announcements/${id}`)
        .send({ published: true })
        .expect(200);
      expect(await api.persistenceSnapshot(id)).toEqual(beforePublishedNoop);
      const withdrawn = await api
        .authorized()
        .patch(`/api/announcements/${id}`)
        .send({ published: false })
        .expect(200);
      expect(withdrawn.body).toMatchObject({
        status: 'DRAFT',
        publishedAt: firstPublishedAt,
      });
      const archived = await api
        .authorized()
        .post(`/api/announcements/${id}/archive`)
        .expect(200);
      expect(archived.body).toMatchObject({
        status: 'ARCHIVED',
        publishedAt: firstPublishedAt,
      });
      const beforeRepeatArchive = await api.persistenceSnapshot(id);
      await api
        .authorized()
        .post(`/api/announcements/${id}/archive`)
        .expect(200);
      expect(await api.persistenceSnapshot(id)).toEqual(beforeRepeatArchive);
      const rejected = await api
        .authorized()
        .patch(`/api/announcements/${id}`)
        .send({ published: true })
        .expect(409);
      expect(rejected.body).toMatchObject({
        code: 'CONFLICT',
        message: 'Archived announcements are read-only',
        details: {},
        requestId: expect.any(String),
      });
      expect(await api.persistenceSnapshot(id)).toEqual(beforeRepeatArchive);
    } finally {
      await api.close();
    }
  }, 120000);

  it('serializes PostgreSQL publish, withdrawal, and archive races through row locks', async () => {
    const api =
      await startAnnouncementAdministrationHttpHarness('announcement-race');
    try {
      const draft = await api.seedAnnouncement({
        title: 'Concurrent publish',
        body: 'A valid body for concurrent publication.',
      });
      const publishLock = await api.holdAnnouncementLock(draft.id);
      const publishers = [
        api
          .authorized()
          .patch(`/api/announcements/${draft.id}`)
          .send({ published: true })
          .then((response) => response),
        api
          .authorized()
          .patch(`/api/announcements/${draft.id}`)
          .send({ published: true })
          .then((response) => response),
      ];
      await publishLock.waitForBlocked(2);
      await publishLock.release();
      expect(
        (await Promise.all(publishers)).map((response) => response.status),
      ).toEqual([200, 200]);
      expect(await api.auditCount('ANNOUNCEMENT_PUBLISHED', draft.id)).toBe(1);
      expect((await api.announcementState(draft.id))?.status).toBe('PUBLISHED');

      const published = await api.seedAnnouncement({
        title: 'Concurrent withdraw',
        body: 'A valid body for concurrent withdrawal.',
        status: 'PUBLISHED',
      });
      const withdrawalLock = await api.holdAnnouncementLock(published.id);
      const withdrawals = [
        api
          .authorized()
          .patch(`/api/announcements/${published.id}`)
          .send({ published: false })
          .then((response) => response),
        api
          .authorized()
          .patch(`/api/announcements/${published.id}`)
          .send({ published: false })
          .then((response) => response),
      ];
      await withdrawalLock.waitForBlocked(2);
      await withdrawalLock.release();
      expect(
        (await Promise.all(withdrawals)).map((response) => response.status),
      ).toEqual([200, 200]);
      expect(await api.auditCount('ANNOUNCEMENT_WITHDRAWN', published.id)).toBe(
        1,
      );
      expect((await api.announcementState(published.id))?.status).toBe('DRAFT');

      const archiveTarget = await api.seedAnnouncement({
        title: 'Concurrent archive',
        body: 'A valid body for concurrent archive.',
      });
      const archiveLock = await api.holdAnnouncementLock(archiveTarget.id);
      const archivers = [
        api
          .authorized()
          .post(`/api/announcements/${archiveTarget.id}/archive`)
          .then((response) => response),
        api
          .authorized()
          .post(`/api/announcements/${archiveTarget.id}/archive`)
          .then((response) => response),
      ];
      await archiveLock.waitForBlocked(2);
      await archiveLock.release();
      expect(
        (await Promise.all(archivers)).map((response) => response.status),
      ).toEqual([200, 200]);
      expect(
        await api.auditCount('ANNOUNCEMENT_ARCHIVED', archiveTarget.id),
      ).toBe(1);
      expect((await api.announcementState(archiveTarget.id))?.status).toBe(
        'ARCHIVED',
      );
    } finally {
      await api.close();
    }
  }, 120000);

  it('rolls back every announcement write when PostgreSQL rejects its audit insert', async () => {
    const api = await startAnnouncementAdministrationHttpHarness(
      'announcement-rollback',
    );
    try {
      const countBeforeCreate = await api.announcementCount();
      const createFailure = await api.installAuditFailure(
        'ANNOUNCEMENT_CREATED',
      );
      try {
        await api
          .authorized()
          .post('/api/announcements')
          .send({
            title: 'Rollback create',
            body: 'This create must roll back with its audit.',
          })
          .expect(500);
        expect(await api.announcementCount()).toBe(countBeforeCreate);
      } finally {
        await createFailure.remove();
      }
      const target = await api.seedAnnouncement({
        title: 'Rollback target',
        body: 'This target must retain its original body.',
      });
      const beforeUpdate = await api.persistenceSnapshot(target.id);
      const updateFailure = await api.installAuditFailure(
        'ANNOUNCEMENT_UPDATED',
      );
      try {
        await api
          .authorized()
          .patch(`/api/announcements/${target.id}`)
          .send({
            title: 'Changed rollback title',
            body: 'This changed content must not commit.',
          })
          .expect(500);
        expect(await api.persistenceSnapshot(target.id)).toEqual(beforeUpdate);
      } finally {
        await updateFailure.remove();
      }
      const beforeArchive = await api.persistenceSnapshot(target.id);
      const archiveFailure = await api.installAuditFailure(
        'ANNOUNCEMENT_ARCHIVED',
      );
      try {
        await api
          .authorized()
          .post(`/api/announcements/${target.id}/archive`)
          .expect(500);
        expect(await api.persistenceSnapshot(target.id)).toEqual(beforeArchive);
      } finally {
        await archiveFailure.remove();
      }
      const publicationTarget = await api.seedAnnouncement({
        title: 'Publication rollback',
        body: 'This publication must retain a draft state.',
      });
      const beforePublication = await api.persistenceSnapshot(
        publicationTarget.id,
      );
      const publicationFailure = await api.installAuditFailure(
        'ANNOUNCEMENT_PUBLISHED',
      );
      try {
        await api
          .authorized()
          .patch(`/api/announcements/${publicationTarget.id}`)
          .send({ published: true })
          .expect(500);
        expect(await api.persistenceSnapshot(publicationTarget.id)).toEqual(
          beforePublication,
        );
      } finally {
        await publicationFailure.remove();
      }
      const withdrawalTarget = await api.seedAnnouncement({
        title: 'Withdrawal rollback',
        body: 'This withdrawal must retain a published state.',
        status: 'PUBLISHED',
      });
      const beforeWithdrawal = await api.persistenceSnapshot(
        withdrawalTarget.id,
      );
      const withdrawalFailure = await api.installAuditFailure(
        'ANNOUNCEMENT_WITHDRAWN',
      );
      try {
        await api
          .authorized()
          .patch(`/api/announcements/${withdrawalTarget.id}`)
          .send({ published: false })
          .expect(500);
        expect(await api.persistenceSnapshot(withdrawalTarget.id)).toEqual(
          beforeWithdrawal,
        );
      } finally {
        await withdrawalFailure.remove();
      }
    } finally {
      await api.close();
    }
  }, 120000);
});
