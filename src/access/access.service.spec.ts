import { ConfigService } from '@nestjs/config';
import {
  AccessDirection,
  AccessDecision,
  AccessEvent,
} from './access-event.entity';
import { AccessPass } from './access-pass.entity';
import { AccessService } from './access.service';
import { SecretCryptoService } from './secret-crypto.service';

describe('AccessService', () => {
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
    const key = Buffer.alloc(32, 7).toString('base64');
    const crypto = new SecretCryptoService({
      get: () => key,
    } as unknown as ConfigService);
    const service = new AccessService(
      passes as never,
      eventRepository as never,
      residents as never,
      crypto,
    );
    await service.createPass(resident.id, 1);
    const qr = await service.currentQr(resident.id, pass!.id);
    const clientEventId = '22222222-2222-4222-8222-222222222222';
    const first = await service.validate(
      qr.payload,
      clientEventId,
      AccessDirection.ENTRY,
      'guard-1',
    );
    const second = await service.validate(
      qr.payload,
      clientEventId,
      AccessDirection.ENTRY,
      'guard-1',
    );
    expect(first.decision).toBe(AccessDecision.ALLOWED);
    expect(first).toMatchObject({
      guardId: 'guard-1',
      residentId: 'resident-1',
      unitId: 'unit-1',
      direction: AccessDirection.ENTRY,
      decision: AccessDecision.ALLOWED,
      reason: 'VALID_PASS',
      occurredAt,
    });
    expect(second.id).toBe(first.id);
    expect(eventRepository.save).toHaveBeenCalledTimes(1);
  });

  it('records malformed QR payloads as denied', async () => {
    const eventRepository = {
      findOneBy: jest.fn().mockResolvedValue(null),
      create: (value: AccessEvent) => value,
      save: jest.fn((value: AccessEvent) => Promise.resolve(value)),
    };
    const service = new AccessService(
      {} as never,
      eventRepository as never,
      {} as never,
      {} as never,
    );
    const result = await service.validate(
      'not-json',
      '33333333-3333-4333-8333-333333333333',
      AccessDirection.ENTRY,
      'guard-1',
    );
    expect(result).toMatchObject({
      guardId: 'guard-1',
      residentId: null,
      unitId: null,
      direction: AccessDirection.ENTRY,
      decision: AccessDecision.DENIED,
      reason: 'INVALID_QR',
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
    );

    const result = await service.currentQr('resident-1', pass.id);
    expect(JSON.stringify(result)).not.toContain('encrypted-secret');
    expect(JSON.stringify(result)).not.toContain('decrypted-secret');
    expect(result.contract).toBe('sigra.access.v1');
  });
});
