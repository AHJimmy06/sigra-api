import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AnnouncementChange } from './announcement-change.entity';
import { AnnouncementChangeClock } from './announcement-change-clock.entity';
import {
  AnnouncementCursorError,
  decodeAnnouncementCursor,
  encodeAnnouncementCursor,
} from './announcement-cursor';

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 100;

type FeedRequest = {
  cursor?: string;
  limit?: number;
};

type FeedItem =
  | {
      position: string;
      announcementId: string;
      kind: 'UPSERT';
      action: 'PUBLISHED' | 'UPDATED';
      title: string;
      body: string;
      publishedAt: string;
      author: { name: string | null };
      occurredAt: string;
    }
  | {
      position: string;
      announcementId: string;
      kind: 'TOMBSTONE';
      action: 'WITHDRAWN' | 'ARCHIVED';
      occurredAt: string;
    };

export type ResidentAnnouncementFeed = {
  items: FeedItem[];
  checkpoint: string;
  hasMore: boolean;
  nextCursor?: string;
  syncedAt: string;
};

export class AnnouncementFeedCursorError extends Error {
  constructor(message = 'Announcement feed cursor is invalid') {
    super(message);
    this.name = 'AnnouncementFeedCursorError';
  }
}

@Injectable()
export class ResidentAnnouncementFeedService {
  constructor(private readonly dataSource: DataSource) {}

  async getFeed(request: FeedRequest): Promise<ResidentAnnouncementFeed> {
    const limit = request.limit ?? DEFAULT_LIMIT;
    if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT) {
      throw new AnnouncementFeedCursorError(
        'Announcement feed limit is invalid',
      );
    }

    return this.dataSource.transaction('REPEATABLE READ', async (manager) => {
      const clock = await manager
        .getRepository(AnnouncementChangeClock)
        .findOneByOrFail({ id: 1 });
      const currentHigh = clock.value;
      const cursor = this.readCursor(request.cursor, currentHigh);
      const high = cursor.a === cursor.h ? currentHigh : cursor.h;
      const syncedAt = await readSyncedAt(manager);
      const changes = await manager
        .getRepository(AnnouncementChange)
        .createQueryBuilder('change')
        .where('change.position > :after AND change.position <= :high', {
          after: cursor.a,
          high,
        })
        .orderBy('change.position', 'ASC')
        .take(limit + 1)
        .getMany();
      const hasMore = changes.length > limit;
      const page = changes.slice(0, limit);
      const nextCursor = hasMore
        ? encodeAnnouncementCursor({ a: page.at(-1)!.position, h: high })
        : undefined;

      return {
        items: page.map(mapFeedItem),
        checkpoint: encodeAnnouncementCursor({ a: high, h: high }),
        hasMore,
        ...(nextCursor ? { nextCursor } : {}),
        syncedAt,
      };
    });
  }

  private readCursor(value: string | undefined, currentHigh: string) {
    if (value === undefined) return { a: '0', h: currentHigh };
    try {
      const cursor = decodeAnnouncementCursor(value);
      if (BigInt(cursor.h) > BigInt(currentHigh)) {
        throw new AnnouncementCursorError();
      }
      return cursor;
    } catch (error) {
      if (error instanceof AnnouncementCursorError) {
        throw new AnnouncementFeedCursorError();
      }
      throw error;
    }
  }
}

function mapFeedItem(change: AnnouncementChange): FeedItem {
  if (change.kind === 'TOMBSTONE') {
    return {
      position: change.position,
      announcementId: change.announcementId,
      kind: 'TOMBSTONE',
      action: change.action as 'WITHDRAWN' | 'ARCHIVED',
      occurredAt: change.occurredAt.toISOString(),
    };
  }
  return {
    position: change.position,
    announcementId: change.announcementId,
    kind: 'UPSERT',
    action: change.action as 'PUBLISHED' | 'UPDATED',
    title: change.title!,
    body: change.body!,
    publishedAt: change.publishedAt!.toISOString(),
    author: { name: change.authorDisplayName },
    occurredAt: change.occurredAt.toISOString(),
  };
}

async function readSyncedAt(manager: {
  query(sql: string): Promise<Array<{ syncedAt: string | Date }>>;
}): Promise<string> {
  const [row] = await manager.query('SELECT clock_timestamp() AS "syncedAt"');
  return new Date(row.syncedAt).toISOString();
}
