import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { configureHttpApp } from '../src/common/http/configure-http-app';
import { HttpContractTestModule } from './http-contract-test.module';

describe('HTTP contract (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [HttpContractTestModule],
    }).compile();
    app = module.createNestApplication();
    configureHttpApp(app);
    configureHttpApp(app);
    await app.listen(0);
  });

  it('keeps success bodies unchanged and correlates a valid request ID', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/contract/success')
      .set('X-Request-Id', 'caller.trace_1')
      .expect(200, { ok: true, items: ['unchanged'] });
    expect(response.headers['x-request-id']).toBe('caller.trace_1');
  });

  it('returns typed validation details and a generic bad request shape', async () => {
    const validation = await request(app.getHttpServer())
      .post('/api/contract/validation')
      .send({ name: 1, contact: { email: 'not-an-email' } })
      .expect(400);
    expect(validation.body).toEqual({
      code: 'VALIDATION_ERROR',
      message: 'Validation failed',
      details: {
        'contact.email': ['email must be an email'],
        name: ['name must be a string'],
      },
      requestId: validation.headers['x-request-id'],
    });
    const generic = await request(app.getHttpServer())
      .get('/api/contract/bad-request')
      .expect(400);
    expect(generic.body).toEqual({
      code: 'BAD_REQUEST',
      message: 'Bad request',
      details: {},
      requestId: generic.headers['x-request-id'],
    });
  });

  it('maps missing or expired authentication and wrong roles to public 401/403 responses', async () => {
    const missing = await request(app.getHttpServer())
      .get('/api/contract/missing-auth')
      .expect(401);
    expect(missing.body).toEqual({
      code: 'UNAUTHORIZED',
      message: 'Bearer token required',
      details: {},
      requestId: missing.headers['x-request-id'],
    });
    const forbidden = await request(app.getHttpServer())
      .get('/api/contract/forbidden')
      .expect(403);
    expect(forbidden.body).toEqual({
      code: 'FORBIDDEN',
      message: 'Insufficient role',
      details: {},
      requestId: forbidden.headers['x-request-id'],
    });
  });

  it('maps 404, 409, and 500 without leaking internal values', async () => {
    const missing = await request(app.getHttpServer())
      .get('/api/missing')
      .expect(404);
    expect(missing.body).toEqual({
      code: 'NOT_FOUND',
      message: 'Not found',
      details: {},
      requestId: missing.headers['x-request-id'],
    });
    const conflict = await request(app.getHttpServer())
      .delete('/api/contract/unit')
      .expect(409);
    expect((conflict.body as { message: string }).message).toBe(
      'Unit cannot be deleted while residents are linked to it',
    );
    const failure = await request(app.getHttpServer())
      .get('/api/contract/failure')
      .expect(500);
    expect(failure.body).toEqual({
      code: 'INTERNAL_ERROR',
      message: 'Internal server error',
      details: {},
      requestId: failure.headers['x-request-id'],
    });
    expect(JSON.stringify(failure)).not.toContain('token=secret');
  });

  it('replaces invalid IDs without changing success behavior', async () => {
    const invalid = await request(app.getHttpServer())
      .get('/api/contract/success')
      .set('X-Request-Id', 'x'.repeat(129))
      .expect(200);
    expect(invalid.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/i);
  });

  it('replaces repeated physical request ID headers without reflecting them', async () => {
    const unsafeRequestIds = ['first', 'second'];
    const response = await request(app.getHttpServer())
      .get('/api/missing')
      .set('X-Request-Id', unsafeRequestIds)
      .expect(404);
    const replacement = response.headers['x-request-id'];

    expect(replacement).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    expect(response.body).toEqual({
      code: 'NOT_FOUND',
      message: 'Not found',
      details: {},
      requestId: replacement,
    });
    for (const unsafeRequestId of unsafeRequestIds) {
      expect(replacement).not.toContain(unsafeRequestId);
      expect(response.text).not.toContain(unsafeRequestId);
    }
  });

  it('isolates concurrent request IDs', async () => {
    const [first, second] = await Promise.all([
      request(app.getHttpServer())
        .get('/api/contract/success')
        .set('X-Request-Id', 'one')
        .expect(200)
        .then((response) => response),
      request(app.getHttpServer())
        .get('/api/contract/success')
        .set('X-Request-Id', 'two')
        .expect(200)
        .then((response) => response),
    ]);
    expect([
      first.headers['x-request-id'],
      second.headers['x-request-id'],
    ]).toEqual(['one', 'two']);
  });

  it('normalizes rate-limit responses as the Phase 0 429 contract', async () => {
    await request(app.getHttpServer()).get('/api/rate-limit').expect(200);
    const limited = await request(app.getHttpServer())
      .get('/api/rate-limit')
      .expect(429);
    expect(limited.body).toEqual({
      code: 'RATE_LIMITED',
      message: 'Too many requests',
      details: {},
      requestId: limited.headers['x-request-id'],
    });
  });

  afterAll(() => app.close());
});
