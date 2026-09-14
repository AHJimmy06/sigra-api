import { Announcement } from './announcement.entity';
import { AnnouncementResponseDto } from './announcement.dto';

export function mapAnnouncementResponse(
  announcement: Announcement,
): AnnouncementResponseDto {
  const hasCompleteSnapshot = Boolean(
    announcement.authorIdSnapshot && announcement.authorEmailSnapshot,
  );

  return {
    id: announcement.id,
    title: announcement.title,
    body: announcement.body,
    status: announcement.status,
    publishedAt: announcement.publishedAt?.toISOString() ?? null,
    authorId: announcement.authorIdSnapshot,
    author: hasCompleteSnapshot
      ? {
          id: announcement.authorIdSnapshot!,
          name: announcement.authorDisplayNameSnapshot,
          email: announcement.authorEmailSnapshot!,
        }
      : null,
    createdAt: announcement.createdAt.toISOString(),
    updatedAt: announcement.updatedAt.toISOString(),
  };
}
