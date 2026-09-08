import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { hash } from 'bcryptjs';
import { DataSource, Repository } from 'typeorm';
import { Role } from '../common/role.enum';
import { User } from '../users/user.entity';
import { Resident } from '../residents/resident.entity';
import { ResidentialUnit } from '../units/unit.entity';

@Injectable()
export class SeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SeedService.name);
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly dataSource: DataSource,
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
    await this.seedResident(
      process.env.SEED_RESIDENT_EMAIL,
      process.env.SEED_RESIDENT_PASSWORD,
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
  private async seedResident(email?: string, password?: string) {
    if (!email || !password) {
      this.logger.warn('Skipping RESIDENT seed: email or password is missing');
      return;
    }
    if (password.length < 12) {
      throw new Error(
        'Seed password for RESIDENT must contain at least 12 characters',
      );
    }
    const normalized = email.trim().toLowerCase();
    await this.dataSource.transaction(async (manager) => {
      const users = manager.getRepository(User);
      if (await users.existsBy({ email: normalized })) return;
      const units = manager.getRepository(ResidentialUnit);
      const residents = manager.getRepository(Resident);
      const unitCode = process.env.SEED_RESIDENT_UNIT_CODE ?? 'DEMO-101';
      let unit = await units.findOneBy({ code: unitCode });
      unit ??= await units.save(
        units.create({
          code: unitCode,
          address:
            process.env.SEED_RESIDENT_UNIT_ADDRESS ?? 'Development residence',
          parkingSpaces: 1,
          active: true,
        }),
      );
      const resident = await residents.save(
        residents.create({
          name: process.env.SEED_RESIDENT_NAME ?? 'Development Resident',
          phone: null,
          active: true,
          unitId: unit.id,
        }),
      );
      await users.save(
        users.create({
          email: normalized,
          passwordHash: await hash(password, 12),
          role: Role.RESIDENT,
          active: true,
          residentId: resident.id,
        }),
      );
    });
    this.logger.log(`Created development RESIDENT account for ${normalized}`);
  }
}
