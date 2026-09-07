import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { OpenAPIObject } from '@nestjs/swagger';

describe('Phase 0 OpenAPI artifact', () => {
  const document = JSON.parse(
    readFileSync(resolve(process.cwd(), 'docs', 'openapi', 'v1.json'), 'utf8'),
  ) as OpenAPIObject;

  it('resolves operations to one /api prefix', () => {
    expect(document.servers).toEqual([{ url: '/' }]);
    expect(
      Object.keys(document.paths).every(
        (path) => path === '/api' || path.startsWith('/api/'),
      ),
    ).toBe(true);
    expect(
      Object.keys(document.paths).every(
        (path) => !path.startsWith('/api/api/'),
      ),
    ).toBe(true);
  });

  it.each([
    [
      '/api/announcements',
      '#/components/schemas/PaginatedAnnouncementsResponseDto',
    ],
    ['/api/residents', '#/components/schemas/PaginatedResidentsResponseDto'],
    ['/api/tickets', '#/components/schemas/PaginatedTicketsResponseDto'],
    ['/api/units', '#/components/schemas/PaginatedUnitsResponseDto'],
  ])(
    'documents paginated success and stable errors for GET %s',
    (path, schemaRef) => {
      const operation = document.paths[path]?.get;
      if (!operation) throw new Error(`Missing GET ${path}`);
      expect(operation.responses['200']).toMatchObject({
        content: { 'application/json': { schema: { $ref: schemaRef } } },
      });
      expect(operation.responses['400']).toMatchObject({
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Phase0Error' },
          },
        },
      });
      expect(operation.security).toEqual([{ bearer: [] }]);
    },
  );

  it('keeps login public while protected identity requires bearer authentication', () => {
    const login = document.paths['/api/auth/login']?.post;
    const identity = document.paths['/api/auth/me']?.get;
    if (!login || !identity)
      throw new Error('Missing authentication operations');
    expect(login.security).toBeUndefined();
    expect(login.responses['200']).toHaveProperty(
      'content.application/json.schema.$ref',
    );
    expect(login.responses['401']).toHaveProperty(
      'content.application/json.schema.$ref',
      '#/components/schemas/Phase0Error',
    );
    expect(identity.security).toEqual([{ bearer: [] }]);
  });
});
