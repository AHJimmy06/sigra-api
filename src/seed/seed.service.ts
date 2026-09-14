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
    const residentName = this.resolveResidentName();
    await this.seed(
      Role.ADMIN,
      process.env.SEED_ADMIN_EMAIL,
      process.env.SEED_ADMIN_PASSWORD,
      'Development Administrator',
    );
    await this.seed(
      Role.GUARD,
      process.env.SEED_GUARD_EMAIL,
      process.env.SEED_GUARD_PASSWORD,
      'Development Guard',
    );
    await this.seedResident(
      process.env.SEED_RESIDENT_EMAIL,
      process.env.SEED_RESIDENT_PASSWORD,
      residentName,
    );
  }
  private async seed(
    role: Role,
    email: string | undefined,
    password: string | undefined,
    displayName: string,
  ) {
    if (!email || !password) {
      this.logger.warn(`Skipping ${role} seed: email or password is missing`);
      return;
    }
    if (password.length < 12)
      throw new Error(
        `Seed password for ${role} must contain at least 12 characters`,
      );
    const normalized = email.toLowerCase();
    if (await this.users.existsBy({ email: normalized })) {
      await this.fillNullDisplayName(this.users, normalized, displayName);
      return;
    }
    await this.users.save(
      this.users.create({
        email: normalized,
        passwordHash: await hash(password, 12),
        role,
        active: true,
        displayName,
        residentId: null,
      }),
    );
    this.logger.log(`Created development ${role} account for ${normalized}`);
  }
  private async seedResident(
    email: string | undefined,
    password: string | undefined,
    displayName: string,
  ) {
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
      if (await users.existsBy({ email: normalized })) {
        await this.fillNullDisplayName(users, normalized, displayName);
        return;
      }
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
          name: displayName,
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
          displayName,
          residentId: resident.id,
        }),
      );
    });
    this.logger.log(`Created development RESIDENT account for ${normalized}`);
  }
  private resolveResidentName(): string {
    const name = (
      process.env.SEED_RESIDENT_NAME ?? 'Development Resident'
    ).trim();
    if (name.length < 1 || name.length > 120) {
      throw new Error(
        'Seed resident name must be between 1 and 120 characters',
      );
    }
    return name;
  }
  private async fillNullDisplayName(
    users: Repository<User>,
    email: string,
    displayName: string,
  ) {
    const user = await users.findOneBy({ email });
    if (!user || user.displayName !== null) return;
    user.displayName = displayName;
    await users.save(user);
  }
}
