import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
  Max,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUnitDto {
  @IsString() @MinLength(2) @MaxLength(30) code!: string;
  @IsString() @MinLength(5) @MaxLength(160) address!: string;
  @IsInt() @Min(0) @Max(1000) parkingSpaces!: number;
}

export class UpdateUnitDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(30) code?: string;
  @IsOptional() @IsString() @MinLength(5) @MaxLength(160) address?: string;
  @IsOptional() @IsInt() @Min(0) @Max(1000) parkingSpaces?: number;
  @IsOptional() @IsBoolean() active?: boolean;
}

export class UnitResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() code!: string;
  @ApiProperty() address!: string;
  @ApiProperty() parkingSpaces!: number;
  @ApiProperty() active!: boolean;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
  @ApiProperty({ format: 'date-time' }) updatedAt!: string;
}

export class PaginatedUnitsResponseDto {
  @ApiProperty({ type: [UnitResponseDto] }) items!: UnitResponseDto[];
  @ApiProperty() total!: number;
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
}
