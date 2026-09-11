import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { PaginationQueryDto, normalizeSearch } from './pagination.dto';
import { NonEmptyPatchPipe } from './non-empty-patch.pipe';

describe('PaginationQueryDto', () => {
  it('applies stable defaults and transforms valid numeric input', async () => {
    const defaults = plainToInstance(PaginationQueryDto, {});
    expect(defaults).toMatchObject({ page: 1, pageSize: 10 });
    await expect(validate(defaults)).resolves.toHaveLength(0);

    const query = plainToInstance(PaginationQueryDto, {
      page: '2',
      pageSize: '100',
    });
    await expect(validate(query)).resolves.toHaveLength(0);
    expect(query).toMatchObject({ page: 2, pageSize: 100 });
  });

  it.each([
    { page: '0' },
    { page: '1.5' },
    { pageSize: '0' },
    { pageSize: '101' },
    { search: 'x'.repeat(161) },
  ])('rejects invalid pagination input %#', async (value) => {
    await expect(
      validate(plainToInstance(PaginationQueryDto, value)),
    ).resolves.not.toHaveLength(0);
  });

  it('trims a search boundary while preserving its searchable content', () => {
    expect(normalizeSearch('  A-101  ')).toBe('A-101');
    expect(normalizeSearch('  Ana Garcia  ')).toBe('Ana Garcia');
  });

  it('rejects an empty PATCH body but accepts a boolean active update', () => {
    const pipe = new NonEmptyPatchPipe();
    expect(() => pipe.transform({}, {} as never)).toThrow(
      'PATCH body must include at least one field',
    );
    expect(pipe.transform({ active: false }, {} as never)).toEqual({
      active: false,
    });
  });
});
