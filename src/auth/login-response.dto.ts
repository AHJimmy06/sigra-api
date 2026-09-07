import { Role } from '../common/role.enum';

export class LoginUserDto {
  sub!: string;
  email!: string;
  role!: Role;
  residentId!: string | null;
}

export class LoginResponseDto {
  accessToken!: string;
  expiresAt!: string;
  user!: LoginUserDto;
}
