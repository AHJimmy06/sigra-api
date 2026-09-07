import { JwtService } from '@nestjs/jwt';
import { hash } from 'bcryptjs';
import { Role } from '../common/role.enum';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  it('returns a signed profile and audits a valid login', async () => {
    const user = {
      id: 'user-1',
      email: 'admin@example.com',
      role: Role.ADMIN,
      residentId: null,
      active: true,
      passwordHash: await hash('correct-password', 4),
    };
    const repository = { findOne: jest.fn().mockResolvedValue(user) };
    const manager = { getRepository: jest.fn().mockReturnValue(repository) };
    const dataSource = {
      transaction: jest.fn((work: (value: typeof manager) => unknown) =>
        work(manager),
      ),
    };
    const expiresAt = new Date('2026-09-07T18:00:00.000Z');
    const jwt = {
      signAsync: jest.fn().mockResolvedValue('signed-token'),
      decode: jest.fn().mockReturnValue({ exp: expiresAt.getTime() / 1000 }),
    };
    const audit = { record: jest.fn().mockResolvedValue(undefined) };
    const service = new AuthService(
      jwt as unknown as JwtService,
      dataSource as never,
      audit,
    );

    await expect(
      service.login(
        { email: user.email, password: 'correct-password' },
        '127.0.0.1',
      ),
    ).resolves.toMatchObject({
      accessToken: 'signed-token',
      expiresAt: expiresAt.toISOString(),
      user: { role: Role.ADMIN },
    });
    expect(audit.record).toHaveBeenCalledWith(
      manager,
      expect.objectContaining({ action: 'LOGIN_SUCCEEDED', ip: '127.0.0.1' }),
    );
  });

  it('audits and rejects invalid credentials without exposing which field failed', async () => {
    const repository = { findOne: jest.fn().mockResolvedValue(null) };
    const manager = { getRepository: jest.fn().mockReturnValue(repository) };
    const dataSource = {
      transaction: jest.fn((work: (value: typeof manager) => unknown) =>
        work(manager),
      ),
    };
    const audit = { record: jest.fn().mockResolvedValue(undefined) };
    const service = new AuthService(
      { signAsync: jest.fn(), decode: jest.fn() } as unknown as JwtService,
      dataSource as never,
      audit,
    );

    await expect(
      service.login({
        email: 'missing@example.com',
        password: 'wrong-password',
      }),
    ).rejects.toThrow('Invalid credentials');
    expect(audit.record).toHaveBeenCalledWith(
      manager,
      expect.objectContaining({ action: 'LOGIN_FAILED' }),
    );
  });
});
