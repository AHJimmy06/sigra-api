import { JwtService } from '@nestjs/jwt';
import { hash } from 'bcryptjs';
import { Role } from '../common/role.enum';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  it('returns a signed profile for a valid hashed password', async () => {
    const user = {
      id: 'user-1',
      email: 'admin@example.com',
      role: Role.ADMIN,
      residentId: null,
      active: true,
      passwordHash: await hash('correct-password', 4),
    };
    const users = { findOne: jest.fn().mockResolvedValue(user) };
    const jwt = { signAsync: jest.fn().mockResolvedValue('signed-token') };
    const service = new AuthService(
      users as never,
      jwt as unknown as JwtService,
    );
    await expect(
      service.login({ email: user.email, password: 'correct-password' }),
    ).resolves.toMatchObject({
      accessToken: 'signed-token',
      user: { role: Role.ADMIN },
    });
  });

  it('rejects an invalid password without exposing which credential failed', async () => {
    const users = { findOne: jest.fn().mockResolvedValue(null) };
    const service = new AuthService(
      users as never,
      { signAsync: jest.fn() } as unknown as JwtService,
    );
    await expect(
      service.login({
        email: 'missing@example.com',
        password: 'wrong-password',
      }),
    ).rejects.toThrow('Invalid credentials');
  });
});
