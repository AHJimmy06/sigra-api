import { createHash } from 'node:crypto';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ValidateAccessDto } from './access.dto';
import { AccessController } from './access.controller';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../common/roles.decorator';
import { Role } from '../common/role.enum';

describe('guard experience contract', () => {
  it('rejects blank visitor identities and trims valid names', async () => {
    const base = {
      qrPayload: JSON.stringify({
        v: 1,
        passId: '11111111-1111-4111-8111-111111111111',
        token: '123456',
      }),
      clientEventId: '22222222-2222-4222-8222-222222222222',
      direction: 'ENTRY',
    };
    const blank = plainToInstance(ValidateAccessDto, {
      ...base,
      visitorName: '   ',
    });
    expect(
      (await validate(blank)).some((e) => e.property === 'visitorName'),
    ).toBe(true);
    expect(
      plainToInstance(ValidateAccessDto, { ...base, visitorName: ' Ana ' }),
    ).toHaveProperty('visitorName', 'Ana');
    expect(await validate(plainToInstance(ValidateAccessDto, base))).toEqual(
      [],
    );
  });
  it('protects new routes by role', () => {
    const reflector = new Reflector();
    for (const [method, role] of [
      ['preview', Role.GUARD],
      ['arrivals', Role.RESIDENT],
      ['listGuards', Role.ADMIN],
      ['createGuard', Role.ADMIN],
    ]) {
      const handler: unknown = Object.getOwnPropertyDescriptor(
        AccessController.prototype,
        method,
      )?.value;
      if (typeof handler !== 'function') throw new Error('Handler missing');
      expect(reflector.get(ROLES_KEY, handler)).toEqual([role]);
    }
  });
});

import { AccessService } from './access.service';
import { GuardAuthorizationService } from './guard-authorization.service';
import { AccessDecision, AccessDirection } from './access-event.entity';
import { authenticator } from 'otplib';
import { compare } from 'bcryptjs';

it('previews without recording and rechecks revocation', async () => {
  const secret = authenticator.generateSecret();
  const pass = {
    id: 'pass',
    residentId: 'resident',
    validUntil: new Date(Date.now() + 60000),
    revokedAt: null as Date | null,
    encryptedSecret: 'encrypted',
    resident: {
      name: 'Ana',
      active: true,
      unitId: 'unit',
      unit: { active: true, code: 'A1' },
    },
  };
  const events = { save: jest.fn() };
  const ds = { transaction: jest.fn() };
  const service = new AccessService(
    { findOneBy: jest.fn().mockResolvedValue(pass) } as never,
    events as never,
    {} as never,
    { decrypt: () => secret } as never,
    ds as never,
    {} as never,
    {} as never,
  );
  const qr = JSON.stringify({
    v: 1,
    passId: 'pass',
    token: authenticator.generate(secret),
  });
  const preview = service.preview.bind(service);
  expect(preview).toBeDefined();
  expect(await preview(qr)).toEqual({
    residentId: 'resident',
    residentName: 'Ana',
    unitCode: 'A1',
    validUntil: pass.validUntil.toISOString(),
  });
  expect(ds.transaction).not.toHaveBeenCalled();
  expect(events.save).not.toHaveBeenCalled();
  pass.revokedAt = new Date();
  await expect(preview(qr)).rejects.toThrow();
});

it('scopes arrivals to own successful entries with stable maximum', async () => {
  const find = jest.fn().mockResolvedValue([
    {
      id: 'e',
      visitorName: 'Ana',
      occurredAt: new Date('2026-01-01'),
      unit: { code: 'A1' },
    },
  ]);
  const service = new AccessService(
    {} as never,
    { find } as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
  );
  const arrivals = service.arrivals.bind(service);
  expect(arrivals).toBeDefined();
  expect(await arrivals('own')).toEqual({
    items: [
      {
        id: 'e',
        visitorName: 'Ana',
        occurredAt: '2026-01-01T00:00:00.000Z',
        unitCode: 'A1',
      },
    ],
  });
  expect(find).toHaveBeenCalledWith({
    where: {
      residentId: 'own',
      decision: AccessDecision.ALLOWED,
      direction: AccessDirection.ENTRY,
    },
    relations: { unit: true },
    order: { occurredAt: 'DESC', id: 'DESC' },
    take: 50,
  });
});

it('creates unauthorized guards with normalized email and hashed password', async () => {
  const users = {
    exists: jest.fn().mockResolvedValue(false),
    create: jest.fn((v: Record<string, unknown>) => v),
    save: jest.fn((v: Record<string, unknown>) =>
      Promise.resolve({ ...v, id: 'guard' }),
    ),
  };
  const audit = {
    create: jest.fn((v: Record<string, unknown>) => v),
    save: jest.fn(),
  };
  const ds = {
    transaction: jest.fn((work: (manager: unknown) => unknown) =>
      work({
        getRepository: (type: { name: string }) =>
          type.name === 'User' ? users : audit,
      }),
    ),
  };
  const service = new GuardAuthorizationService(ds as never);
  const create = service.createGuard.bind(service);
  expect(create).toBeDefined();
  const result = await create(
    {
      email: ' TEST@Example.com ',
      password: 'password123',
      displayName: ' Gate ',
    },
    {
      sub: 'admin',
      role: Role.ADMIN,
      email: 'admin@test.com',
      residentId: null,
    },
  );
  expect(result).toEqual({
    id: 'guard',
    email: 'test@example.com',
    displayName: 'Gate',
    active: true,
    authorized: false,
  });
  const saved = users.save.mock.calls[0][0] as { passwordHash: string };
  expect(await compare('password123', saved.passwordHash)).toBe(true);
  expect(JSON.stringify(result)).not.toContain('password');
});

it('includes visitor identity only for supplied-field fingerprints', async () => {
  const actor = {
    sub: 'guard',
    role: Role.GUARD,
    email: 'guard@test.com',
    residentId: null,
  };
  const qr = 'bad';
  const events = {
    findOneBy: jest.fn(),
    create: jest.fn((v: Record<string, unknown>) => v),
    save: jest.fn((v: Record<string, unknown>) =>
      Promise.resolve({
        ...v,
        id: 'event',
        occurredAt: new Date('2026-01-01'),
      }),
    ),
  };
  const transaction = jest.fn((work: (manager: unknown) => unknown) =>
    work({ getRepository: () => events }),
  );
  const service = new AccessService(
    {} as never,
    events as never,
    {} as never,
    {} as never,
    { transaction } as never,
    { record: jest.fn() },
    {} as never,
  );
  await service.validate(qr, 'legacy', AccessDirection.ENTRY, actor, 'r');
  const legacy = events.save.mock.calls[0][0] as { requestFingerprint: string };
  expect(legacy.requestFingerprint).toBe(
    createHash('sha256')
      .update(
        JSON.stringify({ direction: 'ENTRY', guardId: 'guard', qrPayload: qr }),
      )
      .digest('hex'),
  );
  await service.validate(
    qr,
    'visitor',
    AccessDirection.ENTRY,
    actor,
    'r',
    undefined,
    ' Ana ',
  );
  const named = events.save.mock.calls[1][0] as {
    requestFingerprint: string;
    visitorName: string;
  };
  expect(named.visitorName).toBe('Ana');
  expect(named.requestFingerprint).not.toBe(legacy.requestFingerprint);
  events.findOneBy.mockResolvedValue({
    ...named,
    id: 'event',
    decision: AccessDecision.DENIED,
    direction: AccessDirection.ENTRY,
    reason: 'INVALID_QR',
    occurredAt: new Date('2026-01-01'),
  });
  await expect(
    service.validate(
      qr,
      'visitor',
      AccessDirection.ENTRY,
      actor,
      'r',
      undefined,
      'Bob',
    ),
  ).rejects.toThrow('Client event ID');
  expect(transaction).toHaveBeenCalledTimes(2);
});

it('lists only guard projections and translates duplicate conflicts', async () => {
  const users = {
    find: jest.fn().mockResolvedValue([
      {
        id: 'g',
        email: 'g@test.com',
        displayName: null,
        active: true,
        guardGateAuthorized: false,
        passwordHash: 'hidden',
      },
    ]),
    exists: jest.fn().mockResolvedValue(true),
  };
  const ds = {
    getRepository: () => users,
    transaction: jest.fn((work: (manager: unknown) => unknown) =>
      work({ getRepository: () => users }),
    ),
  };
  const service = new GuardAuthorizationService(ds as never);
  expect(await service.listGuards()).toEqual([
    {
      id: 'g',
      email: 'g@test.com',
      displayName: null,
      active: true,
      authorized: false,
    },
  ]);
  expect(users.find).toHaveBeenCalledWith({
    where: { role: Role.GUARD },
    order: { email: 'ASC', id: 'ASC' },
  });
  await expect(
    service.createGuard(
      { email: 'g@test.com', password: 'password123' },
      {
        sub: 'admin',
        role: Role.ADMIN,
        email: 'admin@test.com',
        residentId: null,
      },
    ),
  ).rejects.toMatchObject({ status: 409 });
  ds.transaction.mockRejectedValueOnce({ code: '23505' });
  await expect(
    service.createGuard(
      { email: 'g@test.com', password: 'password123' },
      {
        sub: 'admin',
        role: Role.ADMIN,
        email: 'admin@test.com',
        residentId: null,
      },
    ),
  ).rejects.toMatchObject({ status: 409 });
});

it('keeps preview behind persisted gate authorization', () => {
  const guards = Reflect.getMetadata(
    '__guards__',
    Object.getOwnPropertyDescriptor(AccessController.prototype, 'preview')
      ?.value as object,
  ) as { name: string }[];
  expect(guards.map((guard) => guard.name)).toContain(
    'GuardGateAuthorizationGuard',
  );
});

it.each([
  'expired',
  'resident-inactive',
  'unit-inactive',
  'invalid-token',
  'missing-pass',
])('rejects preview for %s without event writes', async (mode) => {
  const secret = authenticator.generateSecret();
  const pass = {
    id: 'p',
    residentId: 'r',
    validUntil: new Date(Date.now() + 60000),
    revokedAt: null,
    encryptedSecret: 'x',
    resident: {
      active: mode !== 'resident-inactive',
      unitId: 'u',
      unit: { active: mode !== 'unit-inactive', code: 'A' },
      name: 'Ana',
    },
  };
  if (mode === 'expired') pass.validUntil = new Date(0);
  const ds = { transaction: jest.fn() };
  const service = new AccessService(
    {
      findOneBy: jest
        .fn()
        .mockResolvedValue(mode === 'missing-pass' ? null : pass),
    } as never,
    {} as never,
    {} as never,
    { decrypt: () => secret } as never,
    ds as never,
    {} as never,
    {} as never,
  );
  const token =
    mode === 'invalid-token' ? 'invalid' : authenticator.generate(secret);
  await expect(
    service.preview(JSON.stringify({ v: 1, passId: 'p', token })),
  ).rejects.toThrow();
  expect(ds.transaction).not.toHaveBeenCalled();
});
