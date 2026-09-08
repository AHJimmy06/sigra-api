import { ConfigService } from '@nestjs/config';
import {
  AccessDirection,
  AccessDecision,
  AccessEvent,
} from './access-event.entity';
import { AccessPass } from './access-pass.entity';
import { AccessService } from './access.service';
import { SecretCryptoService } from './secret-crypto.service';
import { Role } from '../common/role.enum';

const guard = {
  sub: 'guard-1',
  email: 'guard@example.com',
  role: Role.GUARD,
  residentId: null,
};

const config = {
  get: (_key: string, fallback: string) => fallback,
};

describe('AccessService', () => {
  it('lists filtered access events with deterministic server pagination', async () => {
    const occurredAt = new Date('2026-09-07T12:00:00.000Z');
    const event = {
      id: 'event-1',
      decision: AccessDecision.DENIED,
      direction: AccessDirection.EXIT,
      reason: 'PASS_REVOKED',
      occurredAt,
      resident: { name: 'Ana Garcia' },
      unit: { code: 'A-101' },
      guard: { email: 'guard@example.com', passwordHash: 'secret' },
    } as AccessEvent;
    const query = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[event], 11]),
    };
    const service = new AccessService(
      {} as never,
      { createQueryBuilder: jest.fn().mockReturnValue(query) } as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      config as never,
    );

    const result = await service.listEvents({
      page: 2,
      pageSize: 10,
      from: '2026-09-01',
      to: '2026-09-07',
      decision: AccessDecision.DENIED,
      direction: AccessDirection.EXIT,
      search: 'Ana',
    });

    expect(query.andWhere).toHaveBeenCalledWith('event.occurredAt >= :from', {
      from: new Date('2026-09-01T05:00:00.000Z'),
    });
    expect(query.andWhere).toHaveBeenCalledWith('event.occurredAt < :to', {
      to: new Date('2026-09-08T05:00:00.000Z'),
    });
    expect(query.andWhere).toHaveBeenCalledWith('event.decision = :decision', {
      decision: AccessDecision.DENIED,
    });
    expect(query.andWhere).toHaveBeenCalledWith(
      'event.direction = :direction',
      { direction: AccessDirection.EXIT },
    );
    expect(query.andWhere).toHaveBeenCalledWith(
      '(resident.name ILIKE :search OR unit.code ILIKE :search OR guard.email ILIKE :search)',
      { search: '%Ana%' },
    );
    expect(query.orderBy).toHaveBeenCalledWith('event.occurredAt', 'DESC');
    expect(query.addOrderBy).toHaveBeenCalledWith('event.id', 'DESC');
    expect(query.skip).toHaveBeenCalledWith(10);
    expect(query.take).toHaveBeenCalledWith(10);
    expect(result).toEqual({
      items: [
        {
          id: 'event-1',
          decision: AccessDecision.DENIED,
          direction: AccessDirection.EXIT,
          reason: 'PASS_REVOKED',
          occurredAt: '2026-09-07T12:00:00.000Z',
          requestId: undefined,
          resident: { name: 'Ana Garcia', unitCode: 'A-101' },
          guard: { email: 'guard@example.com' },
        },
      ],
      total: 11,
      page: 2,
      pageSize: 10,
    });
    expect(JSON.stringify(result)).not.toContain('passwordHash');
  });

  it('validates a current TOTP and deduplicates a repeated client event', async () => {
    const events = new Map<string, AccessEvent>();
    const occurredAt = new Date('2026-09-07T12:00:00.000Z');
    const resident = {
      id: 'resident-1',
      unitId: 'unit-1',
      active: true,
      unit: { id: 'unit-1', active: true },
    };
    let pass: AccessPass;
    const passes = {
      create: (value: AccessPass) => value,
      save: jest.fn((value: AccessPass) => {
        pass = {
          ...value,
          id: '11111111-1111-4111-8111-111111111111',
          createdAt: new Date(),
          resident,
        } as AccessPass;
        return Promise.resolve(pass);
      }),
      findOneBy: jest.fn(() => Promise.resolve(pass)),
      find: jest.fn(),
    };
    const eventRepository = {
      create: (value: AccessEvent) => value,
      findOneBy: jest.fn(({ clientEventId }: { clientEventId: string }) =>
        Promise.resolve(events.get(clientEventId) ?? null),
      ),
      save: jest.fn((value: AccessEvent) => {
        const saved = {
          ...value,
          id: 'event-1',
          occurredAt,
        };
        events.set(value.clientEventId, saved);
        return Promise.resolve(saved);
      }),
    };
    const residents = { findOneBy: jest.fn().mockResolvedValue(resident) };
    const manager = {
      getRepository: jest.fn().mockReturnValue(eventRepository),
    };
    const dataSource = {
      transaction: jest.fn((work: (value: typeof manager) => unknown) =>
        work(manager),
      ),
    };
    const audit = {
      record: jest.fn((managerArgument: unknown, eventArgument: unknown) => {
        void managerArgument;
        void eventArgument;
        return Promise.resolve();
      }),
    };
    const key = Buffer.alloc(32, 7).toString('base64');
    const crypto = new SecretCryptoService({
      get: () => key,
    } as unknown as ConfigService);
    const service = new AccessService(
      passes as never,
      eventRepository as never,
      residents as never,
      crypto,
      dataSource as never,
      audit as never,
      config as never,
    );
    await service.createPass(resident.id, 1);
    const qr = await service.currentQr(resident.id, pass!.id);
    const clientEventId = '22222222-2222-4222-8222-222222222222';
    const first = await service.validate(
      qr.payload,
      clientEventId,
      AccessDirection.ENTRY,
      guard,
      'request-1',
    );
    const second = await service.validate(
      qr.payload,
      clientEventId,
      AccessDirection.ENTRY,
      guard,
      'request-2',
    );
    expect(first.decision).toBe(AccessDecision.ALLOWED);
    expect(first).toMatchObject({
      direction: AccessDirection.ENTRY,
      decision: AccessDecision.ALLOWED,
      reason: 'VALID_PASS',
      occurredAt: occurredAt.toISOString(),
      requestId: 'request-1',
    });
    expect(second.id).toBe(first.id);
    expect(eventRepository.save).toHaveBeenCalledTimes(1);
    expect(audit.record).toHaveBeenCalledTimes(1);
    expect(audit.record.mock.calls[0]?.[0]).toBe(manager);
    expect(audit.record.mock.calls[0]?.[1]).toMatchObject({
      actor: guard,
      action: 'ACCESS_VALIDATED',
      metadata: { requestId: 'request-1' },
    });
  });

  it('records malformed QR payloads as denied', async () => {
    const eventRepository = {
      findOneBy: jest.fn().mockResolvedValue(null),
      create: (value: AccessEvent) => value,
      save: jest.fn((value: AccessEvent) =>
        Promise.resolve({
          ...value,
          id: 'event-1',
          occurredAt: new Date('2026-09-07T12:00:00.000Z'),
        }),
      ),
    };
    const manager = {
      getRepository: jest.fn().mockReturnValue(eventRepository),
    };
    const dataSource = {
      transaction: jest.fn((work: (value: typeof manager) => unknown) =>
        work(manager),
      ),
    };
    const service = new AccessService(
      {} as never,
      eventRepository as never,
      {} as never,
      {} as never,
      dataSource as never,
      { record: jest.fn() },
      config as never,
    );
    const result = await service.validate(
      'not-json',
      '33333333-3333-4333-8333-333333333333',
      AccessDirection.ENTRY,
      guard,
      'request-1',
    );
    expect(result).toMatchObject({
      direction: AccessDirection.ENTRY,
      decision: AccessDecision.DENIED,
      reason: 'INVALID_QR',
      requestId: 'request-1',
    });
  });

  it('returns a short-lived QR without exposing encrypted or decrypted secrets', async () => {
    const crypto = {
      decrypt: jest.fn().mockReturnValue('decrypted-secret'),
    };
    const pass = {
      id: 'pass-1',
      residentId: 'resident-1',
      encryptedSecret: 'encrypted-secret',
      validUntil: new Date(Date.now() + 60_000),
      revokedAt: null,
    } as AccessPass;
    const service = new AccessService(
      { findOneBy: jest.fn().mockResolvedValue(pass) } as never,
      {} as never,
      {} as never,
      crypto as never,
      {} as never,
      {} as never,
      config as never,
    );

    const result = await service.currentQr('resident-1', pass.id);
    expect(JSON.stringify(result)).not.toContain('encrypted-secret');
    expect(JSON.stringify(result)).not.toContain('decrypted-secret');
    expect(result.contract).toBe('sigra.access.v1');
  });

  it('rejects an incompatible retry without evaluating or storing it again', async () => {
    const existing = {
      id: 'event-1',
      clientEventId: '22222222-2222-4222-8222-222222222222',
      requestFingerprint: 'different-fingerprint',
    } as AccessEvent;
    const events = { findOneBy: jest.fn().mockResolvedValue(existing) };
    const transaction = jest.fn();
    const service = new AccessService(
      {} as never,
      events as never,
      {} as never,
      {} as never,
      { transaction } as never,
      { record: jest.fn() },
      config as never,
    );

    await expect(
      service.validate(
        '{}',
        existing.clientEventId,
        AccessDirection.ENTRY,
        guard,
        'request-2',
      ),
    ).rejects.toMatchObject({ status: 409 });
    expect(transaction).not.toHaveBeenCalled();
  });
});
