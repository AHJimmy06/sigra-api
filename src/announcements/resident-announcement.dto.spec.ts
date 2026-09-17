import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ResidentAnnouncementQueryDto } from './resident-announcement.dto';

describe('ResidentAnnouncementQueryDto validation', () => {
  it('accepts an empty query object and preserves default undefined limit', async () => {
    const dto = plainToInstance(ResidentAnnouncementQueryDto, {});
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
    expect(dto.cursor).toBeUndefined();
    expect(dto.limit).toBeUndefined();
  });

  it('accepts a valid cursor and numeric limit within bounds', async () => {
    const dto = plainToInstance(ResidentAnnouncementQueryDto, {
      cursor: 'valid-base64url-cursor',
      limit: 25,
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
    expect(dto.cursor).toBe('valid-base64url-cursor');
    expect(dto.limit).toBe(25);
  });

  it('transforms string limit from query parameters into an integer', async () => {
    const dto = plainToInstance(ResidentAnnouncementQueryDto, {
      limit: '50',
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
    expect(dto.limit).toBe(50);
  });

  it.each([0, -1, 101, 1.5, 'not-a-number'])(
    'rejects invalid limit value: %p',
    async (limit) => {
      const dto = plainToInstance(ResidentAnnouncementQueryDto, { limit });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const limitError = errors.find((error) => error.property === 'limit');
      expect(limitError).toBeDefined();
    },
  );

  it('rejects a non-string cursor', async () => {
    const dto = plainToInstance(ResidentAnnouncementQueryDto, {
      cursor: 12345,
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    const cursorError = errors.find((error) => error.property === 'cursor');
    expect(cursorError).toBeDefined();
  });
});
