import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateUnitDto {
  @IsString() @MaxLength(50) code!: string;
  @IsString() @MaxLength(200) address!: string;
  @IsInt() @Min(0) parkingSpaces!: number;
}

export class UpdateUnitDto {
  @IsOptional() @IsString() @MaxLength(50) code?: string;
  @IsOptional() @IsString() @MaxLength(200) address?: string;
  @IsOptional() @IsInt() @Min(0) parkingSpaces?: number;
  @IsOptional() @IsBoolean() active?: boolean;
}
