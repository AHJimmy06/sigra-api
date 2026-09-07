import {
  IsEnum,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../common/pagination.dto';
import { TicketPriority, TicketStatus } from './ticket.entity';
import { ApiProperty } from '@nestjs/swagger';
export class CreateTicketDto {
  @IsUUID() clientRequestId!: string;
  @IsString() @MinLength(5) @MaxLength(2000) description!: string;
}
export class UpdateTicketDto {
  @IsEnum(TicketStatus) status!: TicketStatus;
}

export class TicketPaginationQueryDto extends PaginationQueryDto {
  @IsOptional() @IsEnum(TicketStatus) status?: TicketStatus;
  @IsOptional() @IsEnum(TicketPriority) priority?: TicketPriority;
}

export class TicketResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) clientRequestId!: string;
  @ApiProperty({ format: 'uuid' }) residentId!: string;
  @ApiProperty() description!: string;
  @ApiProperty() imageName!: string;
  @ApiProperty({ enum: TicketStatus }) status!: TicketStatus;
  @ApiProperty({ enum: TicketPriority }) priority!: TicketPriority;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
  @ApiProperty({ format: 'date-time' }) updatedAt!: string;
}

export class PaginatedTicketsResponseDto {
  @ApiProperty({ type: [TicketResponseDto] }) items!: TicketResponseDto[];
  @ApiProperty() total!: number;
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
}
