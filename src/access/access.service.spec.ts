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
    const resident = { id: 'resident-1', active: true, unit: { active: true } };
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
          occurredAt: new Date(),
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
    expect(second.id).toBe(first.id);
    expect(eventRepository.save).toHaveBeenCalledTimes(1);
  });

  it('provisions only an active pass owned by the authenticated resident', async () => {
    const key = Buffer.alloc(32, 8).toString('base64');
    const crypto = new SecretCryptoService({
      get: () => key,
    } as unknown as ConfigService);
    const pass = {
      id: '11111111-1111-4111-8111-111111111111',
      residentId: 'resident-1',
      encryptedSecret: crypto.encrypt('JBSWY3DPEHPK3PXP'),
      validUntil: new Date(Date.now() + 60_000),
      revokedAt: null,
    } as AccessPass;
    const passes = {
      findOneBy: jest.fn(({ id, residentId }) =>
        Promise.resolve(
          id === pass.id && residentId === pass.residentId ? pass : null,
        ),
      ),
    };
    const service = new AccessService(
      passes as never,
      {} as never,
      {} as never,
      crypto,
    );

    await expect(service.provision('resident-1', pass.id)).resolves.toEqual({
      contract: 'sigra.access.v1',
      passId: pass.id,
      secret: 'JBSWY3DPEHPK3PXP',
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      validUntil: pass.validUntil,
    });
    await expect(service.provision('resident-2', pass.id)).rejects.toThrow(
      'Active pass not found',
    );
    expect(passes.findOneBy).toHaveBeenLastCalledWith({
      id: pass.id,
      residentId: 'resident-2',
    });
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
      decision: AccessDecision.DENIED,
      reason: 'INVALID_QR',
    });
  });
});
