import { Type } from 'class-transformer';
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

export class PaginationQueryDto {
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

  @IsOptional()
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
