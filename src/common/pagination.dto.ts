import { Transform, Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class PageQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize = 10;
}

export class PaginationQueryDto extends PageQueryDto {
  @IsOptional()
  @Transform(({ value }) => normalizeSearch(value))
  @IsString()
  @MaxLength(160)
  search?: string;
}

export class ActivePaginationQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsIn(['true', 'false'])
  status?: 'true' | 'false';
}

export class ResidentPaginationQueryDto extends ActivePaginationQueryDto {
  @IsOptional()
  @IsUUID()
  unitId?: string;
}

export function normalizeSearch(value: unknown) {
  return typeof value === 'string' ? value.trim() : value;
}
