import {
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { PaginationQueryDto } from '../common/pagination.dto';
import { IsEnum } from 'class-validator';
import { Transform } from 'class-transformer';
import { AnnouncementStatus } from './announcement.entity';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAnnouncementDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(5)
  @MaxLength(160)
  title!: string;
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  body!: string;
  @IsOptional() @IsBoolean() published?: boolean;
}
export class UpdateAnnouncementDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsOptional()
  @IsString()
  @MinLength(5)
  @MaxLength(160)
  title?: string;
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  body?: string;
  @IsOptional() @IsBoolean() published?: boolean;
}

export class AnnouncementPaginationQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(AnnouncementStatus)
  status?: AnnouncementStatus;
}

export class AnnouncementResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() title!: string;
  @ApiProperty() body!: string;
  @ApiProperty({ enum: AnnouncementStatus }) status!: AnnouncementStatus;
  @ApiProperty({ format: 'date-time', nullable: true })
  publishedAt!: string | null;
  @ApiProperty({ format: 'uuid', nullable: true }) authorId!: string | null;
  @ApiProperty({ type: () => AnnouncementAuthorResponseDto, nullable: true })
  author!: AnnouncementAuthorResponseDto | null;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
  @ApiProperty({ format: 'date-time' }) updatedAt!: string;
}

export class AnnouncementAuthorResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ nullable: true }) name!: string | null;
  @ApiProperty({ format: 'email' }) email!: string;
}

export class PaginatedAnnouncementsResponseDto {
  @ApiProperty({ type: [AnnouncementResponseDto] })
  items!: AnnouncementResponseDto[];
  @ApiProperty() total!: number;
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
}
