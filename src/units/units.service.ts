import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ResidentialUnit } from './unit.entity';
import { CreateUnitDto, UpdateUnitDto } from './unit.dto';

@Injectable()
export class UnitsService {
  constructor(
    @InjectRepository(ResidentialUnit)
    private readonly unitRepository: Repository<ResidentialUnit>,
  ) {}

  async list(params: {
    page: number;
    pageSize: number;
    search?: string;
    status?: string;
  }) {
    const { page, pageSize, search } = params;
    const query = this.unitRepository.createQueryBuilder('unit');

    if (search) {
      query.andWhere(
        '(unit.code ILIKE :search OR unit.address ILIKE :search)',
        {
          search: `%${search}%`,
        },
      );
    }

    query.skip((page - 1) * pageSize).take(pageSize);
    query.orderBy('unit.createdAt', 'DESC');

    const [items, total] = await query.getManyAndCount();

    return {
      items,
      total,
      page,
      pageSize,
    };
  }

  async create(dto: CreateUnitDto) {
    const unit = this.unitRepository.create(dto);
    return await this.unitRepository.save(unit);
  }

  async update(id: string, dto: UpdateUnitDto) {
    const unit = await this.unitRepository.findOne({ where: { id } });
    if (!unit) {
      throw new NotFoundException('Unit not found.');
    }
    Object.assign(unit, dto);
    return await this.unitRepository.save(unit);
  }

  async remove(id: string) {
    const unit = await this.unitRepository.findOne({ where: { id } });
    if (!unit) {
      throw new NotFoundException('Unit not found.');
    }
    await this.unitRepository.remove(unit);
  }
}
