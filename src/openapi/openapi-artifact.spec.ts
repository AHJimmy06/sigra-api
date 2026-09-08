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
      '/api/access/events',
      '#/components/schemas/PaginatedAccessEventsResponseDto',
    ],
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
    expect(identity.responses['200']).toHaveProperty(
      'content.application/json.schema.$ref',
      '#/components/schemas/LoginUserDto',
    );
  });

  it('documents the exact access history query without internal user fields', () => {
    const operation = document.paths['/api/access/events']?.get;
    if (!operation) throw new Error('Missing GET /api/access/events');
    expect(
      operation.parameters?.map((parameter) => {
        if ('$ref' in parameter) return parameter.$ref;
        return parameter.name;
      }),
    ).toEqual([
      'page',
      'pageSize',
      'search',
      'from',
      'to',
      'decision',
      'direction',
    ]);
    expect(
      operation.parameters?.every(
        (parameter) => '$ref' in parameter || parameter.required === false,
      ),
    ).toBe(true);
    expect(JSON.stringify(operation)).not.toContain('passwordHash');
    const toParameter = operation.parameters?.find(
      (parameter) => !('$ref' in parameter) && parameter.name === 'to',
    );
    expect(toParameter).toMatchObject({
      description:
        'Inclusive ISO 8601 upper bound. A date-only value includes the full calendar day in the configured RESIDENTIAL_TIME_ZONE.',
    });
  });

  it('documents exact critical success and error shapes', () => {
    expect(
      document.paths['/api/dashboard/metrics']?.get?.responses['200'],
    ).toHaveProperty(
      'content.application/json.schema.$ref',
      '#/components/schemas/DashboardMetricsResponseDto',
    );
    expect(
      document.paths['/api/access/validate']?.post?.responses['200'],
    ).toHaveProperty(
      'content.application/json.schema.$ref',
      '#/components/schemas/ValidateAccessResponseDto',
    );
    expect(document.components?.schemas?.Phase0Error).toMatchObject({
      required: ['code', 'message', 'details', 'requestId'],
    });
    expect(
      document.paths['/api/access/passes']?.get?.responses['200'],
    ).toHaveProperty('content.application/json.schema', {
      type: 'array',
      items: { $ref: '#/components/schemas/AccessPassResponseDto' },
    });
    expect(
      document.paths['/api/access/passes']?.post?.responses['201'],
    ).toHaveProperty(
      'content.application/json.schema.$ref',
      '#/components/schemas/AccessPassResponseDto',
    );
    expect(
      document.paths['/api/access/passes/{id}/qr']?.get?.responses['200'],
    ).toHaveProperty(
      'content.application/json.schema.$ref',
      '#/components/schemas/CurrentQrResponseDto',
    );
    const publicSchemas = JSON.stringify(document.components?.schemas);
    for (const internalField of [
      'passwordHash',
      'encryptedSecret',
      'requestFingerprint',
      'resident.unit',
      'guard.passwordHash',
    ]) {
      expect(publicSchemas).not.toContain(internalField);
    }
    expect(document.components?.schemas).not.toHaveProperty('Resident');
    expect(document.components?.schemas).not.toHaveProperty('ResidentialUnit');
    expect(document.components?.schemas).toHaveProperty(
      'ResidentResponseDto.properties.unit.$ref',
      '#/components/schemas/ResidentUnitResponseDto',
    );
  });
});
