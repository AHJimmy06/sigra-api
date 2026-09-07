import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compare } from 'bcryptjs';
import { DataSource } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { User } from '../users/user.entity';
import { LoginDto } from './login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwt: JwtService,
    private readonly dataSource: DataSource,
    private readonly audit: AuditService,
  ) {}

  async login(dto: LoginDto, ip?: string) {
    const email = dto.email.trim().toLowerCase();
    const authenticated = await this.dataSource.transaction(async (manager) => {
      const user = await manager.getRepository(User).findOne({
        where: { email, active: true },
      });
      const valid = Boolean(
        user && (await compare(dto.password, user.passwordHash)),
      );
      await this.audit.record(manager, {
        ...(valid && user
          ? {
              actor: {
                sub: user.id,
                email: user.email,
                role: user.role,
                residentId: user.residentId,
              },
              resourceId: user.id,
            }
          : {}),
        action: valid ? 'LOGIN_SUCCEEDED' : 'LOGIN_FAILED',
        resourceType: 'AUTH_SESSION',
        metadata: { email },
        ip,
      });
      return valid ? user : null;
    });
    if (!authenticated) throw new UnauthorizedException('Invalid credentials');

    const profile = {
      sub: authenticated.id,
      email: authenticated.email,
      role: authenticated.role,
      residentId: authenticated.residentId,
    };
    const accessToken = await this.jwt.signAsync(profile);
    const decoded: unknown = this.jwt.decode(accessToken);
    if (
      !decoded ||
      typeof decoded !== 'object' ||
      !('exp' in decoded) ||
      typeof decoded.exp !== 'number'
    ) {
      throw new Error('Signed access token has no expiration');
    }
    return {
      accessToken,
      expiresAt: new Date(decoded.exp * 1000).toISOString(),
      user: profile,
    };
  }
}
