const CURSOR_VERSION = 1;
const MAX_UINT64 = 18_446_744_073_709_551_615n;
const base64urlPattern = /^[A-Za-z0-9_-]+$/u;
const uint64Pattern = /^(?:0|[1-9][0-9]*)$/u;

export type AnnouncementCursor = {
  a: string;
  h: string;
};

export class AnnouncementCursorError extends Error {
  constructor(message = 'Announcement cursor is invalid') {
    super(message);
    this.name = 'AnnouncementCursorError';
  }
}

export function encodeAnnouncementCursor(cursor: AnnouncementCursor): string {
  assertCursor(cursor);
  return Buffer.from(
    JSON.stringify({ v: CURSOR_VERSION, a: cursor.a, h: cursor.h }),
  ).toString('base64url');
}

export function decodeAnnouncementCursor(value: string): AnnouncementCursor {
  if (!base64urlPattern.test(value)) throw new AnnouncementCursorError();

  let parsed: unknown;
  try {
    const decoded = Buffer.from(value, 'base64url');
    if (decoded.toString('base64url') !== value) throw new Error();
    parsed = JSON.parse(decoded.toString('utf8'));
  } catch {
    throw new AnnouncementCursorError();
  }

  if (!isCursorShape(parsed)) throw new AnnouncementCursorError();
  const cursor = { a: parsed.a, h: parsed.h };
  assertCursor(cursor);
  if (encodeAnnouncementCursor(cursor) !== value) {
    throw new AnnouncementCursorError();
  }
  return cursor;
}

function isCursorShape(value: unknown): value is {
  v: number;
  a: string;
  h: string;
} {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const cursor = value as Record<string, unknown>;
  return (
    Object.keys(cursor).length === 3 &&
    cursor.v === CURSOR_VERSION &&
    typeof cursor.a === 'string' &&
    typeof cursor.h === 'string'
  );
}

function assertCursor(cursor: AnnouncementCursor): void {
  if (!isUint64(cursor.a) || !isUint64(cursor.h)) {
    throw new AnnouncementCursorError();
  }
  if (BigInt(cursor.a) > BigInt(cursor.h)) {
    throw new AnnouncementCursorError();
  }
}

function isUint64(value: string): boolean {
  return uint64Pattern.test(value) && BigInt(value) <= MAX_UINT64;
}
