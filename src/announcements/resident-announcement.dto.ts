import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ResidentAnnouncementQueryDto {
  @ApiPropertyOptional({
    description: 'Opaque versioned cursor representing synchronization position.',
  })
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiPropertyOptional({
    description: 'Page size limit between 1 and 100.',
    minimum: 1,
    maximum: 100,
    default: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

export class ResidentAnnouncementAuthorDto {
  @ApiProperty({ nullable: true })
  name!: string | null;
}

export class ResidentAnnouncementUpsertItemDto {
  @ApiProperty({ example: '1' })
  position!: string;

  @ApiProperty({ format: 'uuid' })
  announcementId!: string;

  @ApiProperty({ enum: ['UPSERT'] })
  kind!: 'UPSERT';

  @ApiProperty({ enum: ['PUBLISHED', 'UPDATED'] })
  action!: 'PUBLISHED' | 'UPDATED';

  @ApiProperty()
  title!: string;

  @ApiProperty()
  body!: string;

  @ApiProperty({ format: 'date-time' })
  publishedAt!: string;

  @ApiProperty({ type: ResidentAnnouncementAuthorDto })
  author!: ResidentAnnouncementAuthorDto;

  @ApiProperty({ format: 'date-time' })
  occurredAt!: string;
}

export class ResidentAnnouncementTombstoneItemDto {
  @ApiProperty({ example: '2' })
  position!: string;

  @ApiProperty({ format: 'uuid' })
  announcementId!: string;

  @ApiProperty({ enum: ['TOMBSTONE'] })
  kind!: 'TOMBSTONE';

  @ApiProperty({ enum: ['WITHDRAWN', 'ARCHIVED'] })
  action!: 'WITHDRAWN' | 'ARCHIVED';

  @ApiProperty({ format: 'date-time' })
  occurredAt!: string;
}

export type ResidentAnnouncementFeedItem =
  | ResidentAnnouncementUpsertItemDto
  | ResidentAnnouncementTombstoneItemDto;

export class ResidentAnnouncementFeedResponseDto {
  @ApiProperty({
    type: 'array',
    items: {
      oneOf: [
        { $ref: '#/components/schemas/ResidentAnnouncementUpsertItemDto' },
        { $ref: '#/components/schemas/ResidentAnnouncementTombstoneItemDto' },
      ],
    },
  })
  items!: ResidentAnnouncementFeedItem[];

  @ApiProperty({
    description: 'Synchronization checkpoint cursor for future requests.',
  })
  checkpoint!: string;

  @ApiProperty()
  hasMore!: boolean;

  @ApiPropertyOptional({
    description: 'Next cursor when more results are available.',
  })
  nextCursor?: string;

  @ApiProperty({
    format: 'date-time',
    description: 'Server synchronization timestamp in ISO UTC.',
  })
  syncedAt!: string;
}
