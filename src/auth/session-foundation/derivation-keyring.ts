import { hkdfSync } from 'node:crypto';
import {
  DigestKeyring,
  KeyringConfiguration,
  parseKeyring,
} from './digest-keyring';

export type DerivationDomain = 'refresh' | 'csrf';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

export class DerivationKeyring {
  private constructor(
    private readonly activeVersion: string,
    private readonly keys: ReadonlyMap<string, Buffer>,
  ) {}

  static create(
    configuration: KeyringConfiguration & { forbiddenKeyring?: DigestKeyring },
  ): DerivationKeyring {
    const keyring = new DerivationKeyring(
      configuration.activeVersion,
      parseKeyring(configuration),
    );
    if (
      configuration.forbiddenKeyring &&
      configuration.forbiddenKeyring.sharesKeyWith(keyring)
    ) {
      throw new Error('keyring-separation');
    }
    return keyring;
  }

  derive(
    domain: DerivationDomain,
    sessionId: string,
    generation: number,
    version = this.activeVersion,
  ): Buffer {
    if (
      !UUID_PATTERN.test(sessionId.toLowerCase()) ||
      !Number.isInteger(generation) ||
      generation < 0
    ) {
      throw new Error('format:derivation');
    }
    const key = this.keys.get(version);
    if (!key) {
      throw new Error(`active-version:${version}`);
    }
    const info = `sigra:v1:${domain}:${sessionId.toLowerCase()}:${generation}`;
    return Buffer.from(hkdfSync('sha256', key, Buffer.alloc(0), info, 32));
  }

  has(version: string): boolean {
    return this.keys.has(version);
  }

  values(): readonly Buffer[] {
    return [...this.keys.values()];
  }
}
