import { Role } from '../common/role.enum';

export interface AuthUser {
  sub: string;
  email: string;
  role: Role;
  residentId: string | null;
}
