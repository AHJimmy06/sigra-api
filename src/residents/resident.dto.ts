import {
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Matches,
  MinLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

type ResidentProjection = {
  id: string;
  name: string;
  phone: string | null;
  active: boolean;
  archivedAt: Date | null;
  unitId: string;
  createdAt: Date;
  updatedAt: Date;
  unit: UnitProjection;
};

type UnitProjection = {
  id: string;
  code: string;
  address: string;
  parkingSpaces: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export class CreateResidentDto {
  @IsString() @MinLength(3) @MaxLength(100) name!: string;
  @IsOptional()
  @IsString()
  @MinLength(7)
  @MaxLength(40)
  @Matches(/^(?=(?:\D*\d){7,})\+?[0-9\s().-]+(?:\s?(?:ext\.?|x)\s?\d+)?$/i)
  phone?: string;
  @IsUUID() unitId!: string;
  @IsEmail() email!: string;
  @IsString() @MinLength(8) @MaxLength(72) password!: string;
}

export class UpdateResidentDto {
  @IsOptional() @IsString() @MinLength(3) @MaxLength(100) name?: string;
  @IsOptional()
  @IsString()
  @MinLength(7)
  @MaxLength(40)
  @Matches(/^(?=(?:\D*\d){7,})\+?[0-9\s().-]+(?:\s?(?:ext\.?|x)\s?\d+)?$/i)
  phone?: string;
  @IsOptional() @IsUUID() unitId?: string;
  @IsOptional() @IsBoolean() active?: boolean;
}

export class ResidentUnitResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() code!: string;
  @ApiProperty() address!: string;
  @ApiProperty() parkingSpaces!: number;
  @ApiProperty() active!: boolean;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
  @ApiProperty({ format: 'date-time' }) updatedAt!: string;
}

export class ResidentResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ format: 'email' }) email!: string;
  @ApiProperty({ nullable: true }) phone!: string | null;
  @ApiProperty() active!: boolean;
  @ApiProperty({ format: 'date-time', nullable: true }) archivedAt!: string | null;
  @ApiProperty({ format: 'uuid' }) unitId!: string;
  @ApiProperty({ type: ResidentUnitResponseDto })
  unit!: ResidentUnitResponseDto;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
  @ApiProperty({ format: 'date-time' }) updatedAt!: string;
}

export class ResidentUpdateResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ nullable: true }) phone!: string | null;
  @ApiProperty() active!: boolean;
  @ApiProperty({ format: 'uuid' }) unitId!: string;
  @ApiProperty({ type: ResidentUnitResponseDto })
  unit!: ResidentUnitResponseDto;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
  @ApiProperty({ format: 'date-time' }) updatedAt!: string;
}

export class PaginatedResidentsResponseDto {
  @ApiProperty({ type: [ResidentResponseDto] }) items!: ResidentResponseDto[];
  @ApiProperty() total!: number;
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
}

export function normalizeResidentInput<T extends object>(input: T): T {
  const normalized = { ...input } as Record<string, unknown>;
  for (const field of ['name', 'phone']) {
    if (typeof normalized[field] === 'string') normalized[field] = normalized[field].trim();
  }
  if (typeof normalized.email === 'string') normalized.email = normalized.email.trim().toLowerCase();
  return normalized as T;
}

export function mapResidentResponse(resident: ResidentProjection, email: string | undefined): ResidentResponseDto {
  return {
    id: resident.id,
    name: resident.name,
    email: email as string,
    phone: resident.phone,
    active: resident.active,
    archivedAt: resident.archivedAt?.toISOString() ?? null,
    unitId: resident.unitId,
    unit: {
      id: resident.unit.id,
      code: resident.unit.code,
      address: resident.unit.address,
      parkingSpaces: resident.unit.parkingSpaces,
      active: resident.unit.active,
      createdAt: resident.unit.createdAt.toISOString(),
      updatedAt: resident.unit.updatedAt.toISOString(),
    },
    createdAt: resident.createdAt.toISOString(),
    updatedAt: resident.updatedAt.toISOString(),
  };
}
