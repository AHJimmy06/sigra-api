import { ApiProperty } from '@nestjs/swagger';
import { Role } from '../common/role.enum';

export class LoginUserDto {
  @ApiProperty({ format: 'uuid' })
  sub!: string;
  @ApiProperty({ format: 'email' })
  email!: string;
  @ApiProperty({ enum: Role })
  role!: Role;
  @ApiProperty({ format: 'uuid', nullable: true })
  residentId!: string | null;
}

export class LoginResponseDto {
  @ApiProperty()
  accessToken!: string;
  @ApiProperty({ format: 'date-time' })
  expiresAt!: string;
  @ApiProperty({ type: LoginUserDto })
  user!: LoginUserDto;
}
