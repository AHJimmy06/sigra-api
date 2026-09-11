import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { AuthUser } from '../auth/auth.types';
import { Resident } from '../residents/resident.entity';
import {
  CreateUnitDto,
  mapUnitResponse,
  normalizeUnitInput,
  UpdateUnitDto,
} from './unit.dto';
import { ResidentialUnit } from './unit.entity';

@Injectable()
export class UnitsService {
  constructor(
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
  }) {
    const { page, pageSize, search, status } = params;
    const query = this.unitRepository.createQueryBuilder('unit');
    if (search) {
      query.andWhere(
        '(unit.code ILIKE :search OR unit.address ILIKE :search)',
        {
          search: `%${search}%`,
        },
      );
    }
    if (status !== undefined) {
      query.andWhere('unit.active = :status', { status: status === 'true' });
    }
    query
      .orderBy('unit.createdAt', 'DESC')
      .addOrderBy('unit.id', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize);
    const [items, total] = await query.getManyAndCount();
    return { items: items.map(mapUnitResponse), total, page, pageSize };
  }

  async findOne(id: string) {
    const unit = await this.unitRepository.findOne({ where: { id } });
    if (!unit) throw new NotFoundException('Unit not found');
    return mapUnitResponse(unit);
  }

  async create(dto: CreateUnitDto, actor: AuthUser) {
    dto = normalizeUnitInput(dto);
    try {
      return await this.dataSource.transaction(async (manager) => {
        const units = manager.getRepository(ResidentialUnit);
        if (await units.exists({ where: { code: dto.code } })) {
          throw new ConflictException('Unit code is already registered');
        }
        const unit = await units.save(units.create(dto));
        await this.audit.record(manager, {
          actor,
          action: 'UNIT_CREATED',
          resourceType: 'UNIT',
          resourceId: unit.id,
        });
        return unit;
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException('Unit code is already registered');
      }
      throw error;
    }
  }

  async update(id: string, dto: UpdateUnitDto, actor: AuthUser) {
    dto = normalizeUnitInput(dto);
    try {
      return await this.dataSource.transaction(async (manager) => {
        const units = manager.getRepository(ResidentialUnit);
        const unit = await units.findOne({ where: { id } });
        if (!unit) throw new NotFoundException('Unit not found');
        if (dto.active === false) {
          const activeResidents = await manager.getRepository(Resident).count({
            where: { unitId: id, active: true },
          });
          if (activeResidents > 0) {
            throw new ConflictException(
              'Unit cannot be deactivated while active residents are linked to it',
            );
          }
        }
        const previousActive = unit.active;
        const saved = await units.save(units.merge(unit, dto));
        await this.audit.record(manager, {
          actor,
          action:
            dto.active === undefined
              ? 'UNIT_UPDATED'
              : dto.active
                ? 'UNIT_ACTIVATED'
                : 'UNIT_DEACTIVATED',
          resourceType: 'UNIT',
          resourceId: id,
          metadata:
            dto.active === undefined
              ? {}
              : { active: { from: previousActive, to: dto.active } },
        });
        return saved;
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException('Unit code is already registered');
      }
      throw error;
    }
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
