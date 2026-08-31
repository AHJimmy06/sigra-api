import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateAnnouncementDto {
  @IsString() @MaxLength(160) title!: string;
  @IsString() @MaxLength(10000) body!: string;
  @IsOptional() @IsBoolean() published?: boolean;
}
export class UpdateAnnouncementDto {
  @IsOptional() @IsString() @MaxLength(160) title?: string;
  @IsOptional() @IsString() @MaxLength(10000) body?: string;
  @IsOptional() @IsBoolean() published?: boolean;
}
