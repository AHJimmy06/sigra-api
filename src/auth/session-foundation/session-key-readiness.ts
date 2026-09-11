import { Inject, Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { DerivationKeyring } from './derivation-keyring';
import { DigestKeyring } from './digest-keyring';

type VersionLookup = { has(version: string): boolean };

@Injectable()
export class SessionKeyReadiness implements OnApplicationBootstrap {
  constructor(
    private readonly dataSource: DataSource,
    @Inject(DigestKeyring) private readonly digestKeyring: VersionLookup,
    @Inject(DerivationKeyring)
    private readonly derivationKeyring: VersionLookup,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.requireResolved(
      'auth_sessions.current_digest_key_version',
      'SELECT DISTINCT current_digest_key_version AS version FROM auth_sessions',
      this.digestKeyring,
    );
    await this.requireResolved(
      'refresh_operations.presented_digest_key_version',
      'SELECT DISTINCT presented_digest_key_version AS version FROM refresh_operations',
      this.digestKeyring,
    );
    await this.requireResolved(
      'refresh_operations.result_digest_key_version',
      'SELECT DISTINCT result_digest_key_version AS version FROM refresh_operations',
      this.digestKeyring,
    );
    await this.requireResolved(
      'auth_sessions.current_derivation_key_version',
      'SELECT DISTINCT current_derivation_key_version AS version FROM auth_sessions',
      this.derivationKeyring,
    );
    await this.requireResolved(
      'refresh_operations.result_derivation_key_version',
      'SELECT DISTINCT result_derivation_key_version AS version FROM refresh_operations',
      this.derivationKeyring,
    );
  }

  private async requireResolved(
    column: string,
    query: string,
    keyring: VersionLookup,
  ): Promise<void> {
    const rows = await this.dataSource.query<{ version: string }[]>(query);
    for (const { version } of rows) {
      if (!keyring.has(version)) {
        throw new Error(`unresolved-persisted-version:${column}:${version}`);
      }
    }
  }
}
