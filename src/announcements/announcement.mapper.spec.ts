import { Announcement, AnnouncementStatus } from './announcement.entity';
import { mapAnnouncementResponse } from './announcement.mapper';

describe('mapAnnouncementResponse', () => {
  const announcement = {
    id: '11111111-1111-4111-8111-111111111111',
    title: 'Building maintenance',
    body: 'Water service will be interrupted tomorrow.',
    status: AnnouncementStatus.PUBLISHED,
    publishedAt: new Date('2026-09-13T10:00:00.000Z'),
    authorUserId: 'live-user-id',
    authorIdSnapshot: 'snapshot-user-id',
    authorDisplayNameSnapshot: 'Admin User',
    authorEmailSnapshot: 'admin@example.com',
    createdAt: new Date('2026-09-12T10:00:00.000Z'),
    updatedAt: new Date('2026-09-13T11:00:00.000Z'),
  } as Announcement;

  it('returns only the documented snapshot response fields and ISO dates', () => {
    expect(
      mapAnnouncementResponse({ ...announcement, passwordHash: 'secret' }),
    ).toEqual({
      id: announcement.id,
      title: announcement.title,
      body: announcement.body,
      status: AnnouncementStatus.PUBLISHED,
      publishedAt: '2026-09-13T10:00:00.000Z',
      authorId: 'snapshot-user-id',
      author: {
        id: 'snapshot-user-id',
        name: 'Admin User',
        email: 'admin@example.com',
      },
      createdAt: '2026-09-12T10:00:00.000Z',
      updatedAt: '2026-09-13T11:00:00.000Z',
    });
  });

  it('returns null author for all-null or partial snapshots without consulting live author data', () => {
    expect(
      mapAnnouncementResponse({
        ...announcement,
        authorIdSnapshot: null,
        authorDisplayNameSnapshot: null,
        authorEmailSnapshot: null,
        author: { id: 'live-user-id', email: 'live@example.com' },
      }),
    ).toMatchObject({ authorId: null, author: null });
    expect(
      mapAnnouncementResponse({ ...announcement, authorEmailSnapshot: null }),
    ).toMatchObject({ authorId: 'snapshot-user-id', author: null });
  });
});
