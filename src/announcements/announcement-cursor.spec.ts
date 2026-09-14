import {
  AnnouncementCursorError,
  decodeAnnouncementCursor,
  encodeAnnouncementCursor,
} from './announcement-cursor';

describe('announcement cursor codec', () => {
  it('encodes canonical versioned uint64 checkpoints without leaking JSON', () => {
    const cursor = encodeAnnouncementCursor({
      a: '42',
      h: '18446744073709551615',
    });

    expect(cursor).toMatch(/^[A-Za-z0-9_-]+$/u);
    expect(cursor).not.toContain('{');
    expect(decodeAnnouncementCursor(cursor)).toEqual({
      a: '42',
      h: '18446744073709551615',
    });
  });

  it.each([
    'not-base64url',
    'eyJ2IjoyLCJhIjoiMSIsImgiOiIxIn0',
    'eyJ2IjoxLCJhIjoiMDEiLCJoIjoiMSJ9',
    'eyJ2IjoxLCJhIjoiMiIsImgiOiIxIn0',
    'eyJ2IjoxLCJhIjoiMTg0NDY3NDQwNzM3MDk1NTE2MTYiLCJoIjoiMTg0NDY3NDQwNzM3MDk1NTE2MTYifQ',
  ])('rejects invalid cursor %s', (cursor) => {
    expect(() => decodeAnnouncementCursor(cursor)).toThrow(
      AnnouncementCursorError,
    );
  });
});
