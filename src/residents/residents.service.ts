import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Resident } from './resident.entity';
import { ResidentialUnit } from '../units/unit.entity';
import { CreateResidentDto, UpdateResidentDto } from './resident.dto';

@Injectable()
export class ResidentsService {
  constructor(
    @InjectRepository(Resident)
    private readonly residentRepository: Repository<Resident>,
    @InjectRepository(ResidentialUnit)
    private readonly unitRepository: Repository<ResidentialUnit>,
  ) {}

  // Listado paginado y filtrado según los estándares de la Fase 0
  async list(params: {
    page: number;
    pageSize: number;
    search?: string;
    status?: string;
    unitId?: string;
  }) {
    const { page, pageSize, search, status, unitId } = params;

    const query = this.residentRepository.createQueryBuilder('resident');

    // Filtro por texto de búsqueda (nombre o correo)
    if (search) {
      query.andWhere(
        '(resident.name ILIKE :search OR resident.email ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    // Filtro por estado activo/inactivo
    if (status !== undefined) {
      query.andWhere('resident.active = :status', {
        status: status === 'true',
      });
    }

    // Filtro por unidad habitacional
    if (unitId) {
      query.andWhere('resident.unitId = :unitId', { unitId });
    }

    // Paginación y ordenamiento estable obligatorio
    query.skip((page - 1) * pageSize).take(pageSize);
    query.orderBy('resident.createdAt', 'DESC');

    const [items, total] = await query.getManyAndCount();

    return {
      items,
      total,
      page,
      pageSize,
    };
  }
  async create(dto: CreateResidentDto) {
    // 1. Validar que la unidad exista antes de guardar (evita el error 500 de llave foránea)
    const unitExists = await this.unitRepository.findOne({
      where: { id: dto.unitId },
    });
    if (!unitExists) {
      throw new ConflictException({
        code: 'VALIDATION_ERROR',
        message: 'La unidad especificada no existe o no es válida.',
        details: { unitId: ['El ID de la unidad no se encuentra registrado.'] },
      });
    }

    // 2. Crear y guardar el residente de forma segura
    const resident = this.residentRepository.create(dto);
    return await this.residentRepository.save(resident);
  }

  async update(id: string, dto: UpdateResidentDto) {
    const resident = await this.residentRepository.findOne({ where: { id } });
    if (!resident) {
      throw new NotFoundException('Resident not found.');
    }
    Object.assign(resident, dto);
    return await this.residentRepository.save(resident);
  }

  async remove(id: string) {
    const resident = await this.residentRepository.findOne({ where: { id } });
    if (!resident) {
      throw new NotFoundException('Resident not found.');
    }
    // Eliminación lógica o desactivación según el negocio
    resident.active = false;
    await this.residentRepository.save(resident);
    return; // Devuelve vacío para que responda 204 No Content correctamente
  }
}
