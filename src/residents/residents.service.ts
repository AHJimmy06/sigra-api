import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { hash } from 'bcryptjs';
import { DataSource, Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { AuthUser } from '../auth/auth.types';
import { Role } from '../common/role.enum';
import { ResidentialUnit } from '../units/unit.entity';
import { User } from '../users/user.entity';
import { CreateResidentDto, UpdateResidentDto } from './resident.dto';
import { Resident } from './resident.entity';

@Injectable()
export class ResidentsService {
  constructor(
    @InjectRepository(Resident)
    private readonly residentRepository: Repository<Resident>,
    @InjectRepository(ResidentialUnit)
    private readonly unitRepository: Repository<ResidentialUnit>,
    private readonly dataSource: DataSource,
    private readonly audit: AuditService,
  ) {}

  async list(params: {
    page: number;
    pageSize: number;
    search?: string;
    status?: string;
    unitId?: string;
  }) {
    const { page, pageSize, search, status, unitId } = params;
    const query = this.residentRepository
      .createQueryBuilder('resident')
      .leftJoinAndSelect('resident.unit', 'unit')
      .leftJoin(User, 'user', 'user.residentId = resident.id')
      .addSelect('user.email', 'user_email');

    if (search) {
      query.andWhere(
        '(resident.name ILIKE :search OR resident.phone ILIKE :search OR user.email ILIKE :search OR unit.code ILIKE :search)',
        { search: `%${search}%` },
      );
    }
    if (status !== undefined) {
      query.andWhere('resident.active = :status', {
        status: status === 'true',
      });
    }
    if (unitId) query.andWhere('resident.unitId = :unitId', { unitId });

    const total = await query.getCount();
    const result = await query
      .orderBy('resident.createdAt', 'DESC')
      .addOrderBy('resident.id', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getRawAndEntities();
    const items = result.entities.map((resident, index) => {
      const raw = result.raw[index] as Record<string, unknown> | undefined;
      return {
        ...resident,
        email: typeof raw?.user_email === 'string' ? raw.user_email : undefined,
      };
    });
    return { items, total, page, pageSize };
  }

  async create(dto: CreateResidentDto, actor: AuthUser) {
    const email = dto.email.trim().toLowerCase();
    try {
      return await this.dataSource.transaction(async (manager) => {
        const units = manager.getRepository(ResidentialUnit);
        const users = manager.getRepository(User);
        const residents = manager.getRepository(Resident);
        const unit = await units.findOne({
          where: { id: dto.unitId, active: true },
        });
        if (!unit) {
          throw new ConflictException('Unit must exist and be active');
        }
        if (await users.exists({ where: { email } })) {
          throw new ConflictException('Email is already registered');
        }

        const resident = await residents.save(
          residents.create({
            name: dto.name,
            phone: dto.phone,
            unitId: dto.unitId,
          }),
        );
        const user = await users.save(
          users.create({
            email,
            passwordHash: await hash(dto.password, 12),
            role: Role.RESIDENT,
            residentId: resident.id,
          }),
        );
        await this.audit.record(manager, {
          actor,
          action: 'RESIDENT_CREATED',
          resourceType: 'RESIDENT',
          resourceId: resident.id,
          metadata: { unitId: resident.unitId },
        });
        return { ...resident, email: user.email };
      });
    } catch (error) {
      if (isUniqueViolation(error))
        throw new ConflictException('Email is already registered');
      throw error;
    }
  }

  async update(id: string, dto: UpdateResidentDto, actor: AuthUser) {
    if (dto.unitId) {
      const unit = await this.unitRepository.findOne({
        where: { id: dto.unitId, active: true },
      });
      if (!unit) throw new ConflictException('Unit must exist and be active');
    }

    return this.dataSource.transaction(async (manager) => {
      const residents = manager.getRepository(Resident);
      const resident = await residents.findOne({ where: { id } });
      if (!resident) throw new NotFoundException('Resident not found');
      const previousActive = resident.active;
      const saved = await residents.save(residents.merge(resident, dto));
      if (dto.active !== undefined) {
        await manager
          .getRepository(User)
          .update({ residentId: id }, { active: dto.active });
      }
      await this.audit.record(manager, {
        actor,
        action:
          dto.active === undefined
            ? 'RESIDENT_UPDATED'
            : dto.active
              ? 'RESIDENT_ACTIVATED'
              : 'RESIDENT_REVOKED',
        resourceType: 'RESIDENT',
        resourceId: id,
        metadata:
          dto.active === undefined
            ? {}
            : { active: { from: previousActive, to: dto.active } },
      });
      return saved;
    });
  }

  async remove(id: string, actor: AuthUser) {
    await this.update(id, { active: false }, actor);
  }
}

function isUniqueViolation(error: unknown): boolean {
  return Boolean(
    error &&
    typeof error === 'object' &&
    'driverError' in error &&
    (error.driverError as { code?: string }).code === '23505',
  );
}
