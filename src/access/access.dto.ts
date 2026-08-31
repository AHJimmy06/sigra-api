import { IsEnum, IsInt, IsString, IsUUID, Max, Min } from 'class-validator';
import { AccessDirection } from './access-event.entity';

export class CreatePassDto {
  @IsInt() @Min(1) @Max(30) validDays!: number;
}
export class ValidateAccessDto {
  @IsString() qrPayload!: string;
  @IsUUID() clientEventId!: string;
  @IsEnum(AccessDirection) direction!: AccessDirection;
}

export interface QrPayloadV1 {
  v: 1;
  passId: string;
  token: string;
}
