import {
  IsEnum,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { TicketStatus } from './ticket.entity';
export class CreateTicketDto {
  @IsUUID() clientRequestId!: string;
  @IsString() @MinLength(5) @MaxLength(5000) description!: string;
}
export class UpdateTicketDto {
  @IsEnum(TicketStatus) status!: TicketStatus;
}
