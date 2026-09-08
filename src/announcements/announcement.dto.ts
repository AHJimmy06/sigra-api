import {
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { PaginationQueryDto } from '../common/pagination.dto';
import { IsEnum } from 'class-validator';
import { AnnouncementStatus } from './announcement.entity';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAnnouncementDto {
  @IsString() @MinLength(5) @MaxLength(160) title!: string;
  @IsString() @MinLength(10) @MaxLength(2000) body!: string;
  @IsOptional() @IsBoolean() published?: boolean;
}
export class UpdateAnnouncementDto {
  @IsOptional() @IsString() @MinLength(5) @MaxLength(160) title?: string;
  @IsOptional() @IsString() @MinLength(10) @MaxLength(2000) body?: string;
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
  @ApiProperty({ format: 'uuid', nullable: true }) authorUserId!: string | null;
  @ApiProperty({ type: () => AnnouncementAuthorResponseDto, nullable: true })
  author!: AnnouncementAuthorResponseDto | null;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
  @ApiProperty({ format: 'date-time' }) updatedAt!: string;
}

export class AnnouncementAuthorResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ format: 'email' }) email!: string;
}

export class PaginatedAnnouncementsResponseDto {
  @ApiProperty({ type: [AnnouncementResponseDto] })
  items!: AnnouncementResponseDto[];
  @ApiProperty() total!: number;
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
}
