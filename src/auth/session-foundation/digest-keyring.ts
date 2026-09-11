import { createHmac, timingSafeEqual } from 'node:crypto';

export type KeyringConfiguration = {
  activeVersion: string;
  keys: Record<string, string>;
};

export type Digest = { version: string; digest: Buffer };

const VERSION_PATTERN = /^[A-Za-z0-9._-]{1,32}$/;
const BASE64URL_PATTERN = /^[A-Za-z0-9_-]+$/;

export class DigestKeyring {
  private constructor(
    private readonly activeVersion: string,
    private readonly keys: ReadonlyMap<string, Buffer>,
  ) {}

  static create(configuration: KeyringConfiguration): DigestKeyring {
    return new DigestKeyring(
      configuration.activeVersion,
      parseKeyring(configuration),
    );
  }

  digest(credential: string, version = this.activeVersion): Digest {
    if (!BASE64URL_PATTERN.test(credential)) {
      throw new Error('format:credential');
    }
    const key = this.keys.get(version);
    if (!key) {
      throw new Error(`active-version:${version}`);
    }
    return {
      version,
      digest: createHmac('sha256', key)
        .update(`sigra:v1:digest:${version}:${credential}`, 'utf8')
        .digest(),
    };
  }

  has(version: string): boolean {
    return this.keys.has(version);
  }

  candidates(credential: string): readonly Digest[] {
    return [...this.keys.keys()].map((version) =>
      this.digest(credential, version),
    );
  }

  sharesKeyWith(other: { values(): readonly Buffer[] }): boolean {
    return this.values().some((key) =>
      other
        .values()
        .some(
          (candidate) =>
            key.length === candidate.length && timingSafeEqual(key, candidate),
        ),
    );
  }

  values(): readonly Buffer[] {
    return [...this.keys.values()];
  }
}

export function parseKeyring(
  configuration: KeyringConfiguration,
): ReadonlyMap<string, Buffer> {
  if (!VERSION_PATTERN.test(configuration.activeVersion)) {
    throw new Error('format:active-version');
  }
  const entries = Object.entries(configuration.keys);
  if (entries.length === 0) {
    throw new Error('default:keyring');
  }
  const keys = new Map<string, Buffer>();
  for (const [version, encoded] of entries) {
    if (!VERSION_PATTERN.test(version) || !isCanonicalBase64(encoded)) {
      throw new Error('format:keyring');
    }
    if (keys.has(version)) {
      throw new Error('duplicate:keyring');
    }
    const key = Buffer.from(encoded, 'base64');
    if (key.length < 32) {
      throw new Error('key-length:keyring');
    }
    keys.set(version, key);
  }
  if (!keys.has(configuration.activeVersion)) {
    throw new Error(`active-version:${configuration.activeVersion}`);
  }
  return keys;
}

function isCanonicalBase64(value: string): boolean {
  return Buffer.from(value, 'base64').toString('base64') === value;
}
