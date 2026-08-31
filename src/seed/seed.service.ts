import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { hash } from 'bcryptjs';
import { Repository } from 'typeorm';
import { Role } from '../common/role.enum';
import { User } from '../users/user.entity';

@Injectable()
export class SeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SeedService.name);
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}
  async onApplicationBootstrap() {
    if (
      process.env.SEED_DEVELOPMENT_ACCOUNTS !== 'true' ||
      process.env.NODE_ENV === 'production'
    )
      return;
    await this.seed(
      Role.ADMIN,
      process.env.SEED_ADMIN_EMAIL,
      process.env.SEED_ADMIN_PASSWORD,
    );
    await this.seed(
      Role.GUARD,
      process.env.SEED_GUARD_EMAIL,
      process.env.SEED_GUARD_PASSWORD,
    );
  }
  private async seed(role: Role, email?: string, password?: string) {
    if (!email || !password) {
      this.logger.warn(`Skipping ${role} seed: email or password is missing`);
      return;
    }
    if (password.length < 12)
      throw new Error(
        `Seed password for ${role} must contain at least 12 characters`,
      );
    const normalized = email.toLowerCase();
    if (await this.users.existsBy({ email: normalized })) return;
    await this.users.save(
      this.users.create({
        email: normalized,
        passwordHash: await hash(password, 12),
        role,
        active: true,
        residentId: null,
      }),
    );
    this.logger.log(`Created development ${role} account for ${normalized}`);
  }
}
