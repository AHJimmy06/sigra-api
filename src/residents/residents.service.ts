import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { hash } from 'bcryptjs';
import { DataSource, Repository } from 'typeorm';
import { Role } from '../common/role.enum';
import { User } from '../users/user.entity';
import { CreateResidentDto, UpdateResidentDto } from './resident.dto';
import { Resident } from './resident.entity';

@Injectable()
export class ResidentsService {
  constructor(
    @InjectRepository(Resident)
    private readonly residents: Repository<Resident>,
    private readonly dataSource: DataSource,
  ) {}
  list() {
    return this.residents.find({ order: { name: 'ASC' } });
  }
  create(dto: CreateResidentDto) {
    return this.dataSource.transaction(async (manager) => {
      const resident = await manager.save(
        Resident,
        manager.create(Resident, {
          name: dto.name,
          phone: dto.phone ?? null,
          unitId: dto.unitId,
        }),
      );
      await manager.save(
        User,
        manager.create(User, {
          email: dto.email.toLowerCase(),
          passwordHash: await hash(dto.password, 12),
          role: Role.RESIDENT,
          residentId: resident.id,
        }),
      );
      return resident;
    });
  }
  async update(id: string, dto: UpdateResidentDto) {
    return this.dataSource.transaction(async (manager) => {
      const residents = manager.getRepository(Resident);
      const resident = await residents.findOneBy({ id });
      if (!resident) throw new NotFoundException('Resident not found');
      const saved = await residents.save(residents.merge(resident, dto));
      if (dto.active !== undefined)
        await manager
          .getRepository(User)
          .update({ residentId: id }, { active: dto.active });
      return saved;
    });
  }
  async remove(id: string) {
    const resident = await this.residents.findOneBy({ id });
    if (!resident) throw new NotFoundException('Resident not found');
    resident.active = false;
    await this.residents.save(resident);
    await this.dataSource
      .getRepository(User)
      .update({ residentId: id }, { active: false });
  }
}
