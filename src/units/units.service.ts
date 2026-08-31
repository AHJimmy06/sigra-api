import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { CreateUnitDto, UpdateUnitDto } from './unit.dto';
import { ResidentialUnit } from './unit.entity';

@Injectable()
export class UnitsService {
  constructor(
    @InjectRepository(ResidentialUnit)
    private readonly units: Repository<ResidentialUnit>,
  ) {}
  list() {
    return this.units.find({ order: { code: 'ASC' } });
  }
  create(dto: CreateUnitDto) {
    return this.units.save(this.units.create(dto));
  }
  async update(id: string, dto: UpdateUnitDto) {
    const unit = await this.units.findOneBy({ id });
    if (!unit) throw new NotFoundException('Unit not found');
    return this.units.save(this.units.merge(unit, dto));
  }
  async remove(id: string) {
    try {
      const result = await this.units.delete(id);
      if (!result.affected) throw new NotFoundException('Unit not found');
    } catch (error) {
      if (
        error instanceof QueryFailedError &&
        (error.driverError as { code?: string }).code === '23503'
      ) {
        throw new ConflictException(
          'Unit cannot be deleted while residents are linked to it',
        );
      }
      throw error;
    }
  }
}
