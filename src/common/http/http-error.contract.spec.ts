import {
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
  normalizeValidationErrors,
  SAFE_PUBLIC_4XX_MESSAGES,
} from './http-error.contract';
import {
  HttpExceptionFilter,
  normalizeHttpException,
} from './http-exception.filter';
import { getRequestId, requestIdMiddleware } from './request-id.middleware';

describe('HTTP error contract', () => {
  it('normalizes nested validation paths without retaining rejected values', () => {
    const details = normalizeValidationErrors([
      {
        property: 'items',
        value: 'secret',
        target: { secret: 'secret' },
        children: [
          {
            property: '0',
            children: [
              {
                property: 'name',
                constraints: {
                  maxLength: 'too long',
                  isString: 'must be text',
                },
              },
            ],
          },
        ],
      },
      { property: 'email', constraints: { isEmail: 'must be an email' } },
    ]);

    expect(details).toEqual({
      email: ['must be an email'],
      'items.0.name': ['must be text', 'too long'],
    });
    expect(JSON.stringify(details)).not.toContain('secret');
  });

  it('deduplicates and sorts messages from distinct constraint nodes', () => {
    expect(
      normalizeValidationErrors([
        { property: 'name', constraints: { a: 'zeta', b: 'alpha' } },
        { property: 'name', constraints: { c: 'alpha' } },
      ]),
    ).toEqual({ name: ['alpha', 'zeta'] });
  });

  it('preserves only reviewed safe public 4xx messages and sanitizes 5xx errors', () => {
    expect(SAFE_PUBLIC_4XX_MESSAGES.has('Unit not found')).toBe(true);
    expect(SAFE_PUBLIC_4XX_MESSAGES.has('Account is inactive')).toBe(false);
    expect(
      normalizeHttpException(new BadRequestException('untrusted')).body,
    ).toEqual({
      code: 'BAD_REQUEST',
      message: 'Bad request',
    });
    expect(
      normalizeHttpException(new InternalServerErrorException('SQL token'))
        .body,
    ).toEqual({ code: 'INTERNAL_ERROR', message: 'Internal server error' });
    expect(new HttpExceptionFilter()).toBeInstanceOf(HttpExceptionFilter);
  });

  it('accepts exactly one safe request ID and replaces unsafe inputs immutably', () => {
    const valid = runMiddleware('trace_1.2-A');
    expect(valid.id).toBe('trace_1.2-A');
    expect(valid.responseHeader).toBe(valid.id);
    Object.assign(valid.request, { requestId: 'changed' });
    expect(getRequestId(valid.request)).toBe('trace_1.2-A');

    const invalid = runMiddleware(['one', 'two']);
    expect(invalid.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    expect(invalid.id).not.toBe(randomUUID());
  });

  it('keeps concurrent request IDs isolated', async () => {
    const [first, second] = await Promise.all([
      Promise.resolve(runMiddleware('first-id')),
      Promise.resolve(runMiddleware('second-id')),
    ]);
    expect([first.id, second.id]).toEqual(['first-id', 'second-id']);
  });
});

function runMiddleware(header: string | string[]) {
  const request = {
    headers: { 'x-request-id': header },
  } as unknown as Parameters<typeof requestIdMiddleware>[0];
  let responseHeader = '';
  requestIdMiddleware(
    request,
    {
      setHeader: (_name: string, value: string) => (responseHeader = value),
    } as unknown as Parameters<typeof requestIdMiddleware>[1],
    () => undefined,
  );
  return { id: getRequestId(request), request, responseHeader };
}
