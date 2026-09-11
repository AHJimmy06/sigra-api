import { MODULE_METADATA } from '@nestjs/common/constants';
import { RolesGuard } from '../common/roles.guard';
import { JwtAuthGuard } from './jwt-auth.guard';
import { SessionCleanup } from './session-foundation/cleanup';
import { AuthModule } from './auth.module';

describe('AuthModule session primitive integration', () => {
  it('registers the cleanup primitive without changing bearer or role guards', () => {
    const providers = Reflect.getMetadata(
      MODULE_METADATA.PROVIDERS,
      AuthModule,
    ) as unknown[];
    const exports = Reflect.getMetadata(
      MODULE_METADATA.EXPORTS,
      AuthModule,
    ) as unknown[];

    expect(providers).toContain(SessionCleanup);
    expect(exports).toEqual(
      expect.arrayContaining([JwtAuthGuard, RolesGuard, SessionCleanup]),
    );
  });
});
