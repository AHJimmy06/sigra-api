import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  isUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { registerDecorator, type ValidationOptions } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PageQueryDto } from '../common/pagination.dto';
import { AccessDecision, AccessDirection } from './access-event.entity';

export class CreatePassDto {
  @IsInt() @Min(1) @Max(30) validDays!: number;
}
export class ValidateAccessDto {
  @IsString() @IsQrPayloadV1() qrPayload!: string;
  @IsUUID() clientEventId!: string;
  @IsEnum(AccessDirection) direction!: AccessDirection;
}

export class AccessEventQueryDto extends PageQueryDto {
  @ApiPropertyOptional({ type: Number, minimum: 1, default: 1 })
  page = 1;

  @ApiPropertyOptional({
    type: Number,
    minimum: 1,
    maximum: 100,
    default: 10,
  })
  pageSize = 10;

  @ApiPropertyOptional({ maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional({ description: 'Inclusive ISO 8601 lower bound.' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({
    description:
      'Inclusive ISO 8601 upper bound. A date-only value includes the full calendar day in the configured RESIDENTIAL_TIME_ZONE.',
  })
  @IsOptional()
  @IsDateString()
  to?: string;

  @ApiPropertyOptional({ enum: AccessDecision })
  @IsOptional()
  @IsEnum(AccessDecision)
  decision?: AccessDecision;

  @ApiPropertyOptional({ enum: AccessDirection })
  @IsOptional()
  @IsEnum(AccessDirection)
  direction?: AccessDirection;
}

export class AccessEventResidentResponseDto {
  @ApiProperty() name!: string;
  @ApiProperty({ nullable: true }) unitCode!: string | null;
}

export class AccessEventGuardResponseDto {
  @ApiProperty() email!: string;
}

export class AccessEventResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ enum: AccessDecision }) decision!: AccessDecision;
  @ApiProperty() reason!: string;
  @ApiProperty({ enum: AccessDirection }) direction!: AccessDirection;
  @ApiProperty({ format: 'date-time' }) occurredAt!: string;
  @ApiProperty({ nullable: true }) requestId!: string | null;
  @ApiProperty({ type: AccessEventResidentResponseDto, nullable: true })
  resident!: AccessEventResidentResponseDto | null;
  @ApiProperty({ type: AccessEventGuardResponseDto })
  guard!: AccessEventGuardResponseDto;
}

export class ValidateAccessResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ enum: AccessDecision }) decision!: AccessDecision;
  @ApiProperty() reason!: string;
  @ApiProperty({ enum: AccessDirection }) direction!: AccessDirection;
  @ApiProperty({ format: 'date-time' }) occurredAt!: string;
  @ApiProperty() requestId!: string;
}

export class AccessPassResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) residentId!: string;
  @ApiProperty({ format: 'date-time' }) validUntil!: string;
  @ApiProperty({ format: 'date-time', nullable: true })
  revokedAt!: string | null;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
}

export class CurrentQrResponseDto {
  @ApiProperty({
    description:
      'Opaque, short-lived payload to render as a QR code. Its internal verification material is not documented or exposed separately.',
  })
  payload!: string;
  @ApiProperty({ example: 30 }) expiresInSeconds!: number;
  @ApiProperty({ example: 'sigra.access.v1' }) contract!: string;
}

export class PaginatedAccessEventsResponseDto {
  @ApiProperty({ type: [AccessEventResponseDto] })
  items!: AccessEventResponseDto[];
  @ApiProperty() total!: number;
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
}

export interface QrPayloadV1 {
  v: 1;
  passId: string;
  token: string;
}

function IsQrPayloadV1(validationOptions?: ValidationOptions) {
  return (target: object, propertyName: string) => {
    registerDecorator({
      name: 'isQrPayloadV1',
      target: target.constructor,
      propertyName,
      options: {
        message: 'qrPayload must contain a valid sigra.access.v1 payload',
        ...validationOptions,
      },
      validator: {
        validate(value: unknown) {
          if (typeof value !== 'string') return false;
          try {
            const payload = JSON.parse(value) as Record<string, unknown>;
            return (
              payload !== null &&
              !Array.isArray(payload) &&
              payload.v === 1 &&
              typeof payload.passId === 'string' &&
              isUUID(payload.passId) &&
              typeof payload.token === 'string' &&
              /^\d{6}$/.test(payload.token)
            );
          } catch {
            return false;
          }
        },
      },
    });
  };
}
