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
