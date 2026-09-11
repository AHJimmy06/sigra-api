import {
  DigestKeyring,
  KeyringConfiguration,
} from '../auth/session-foundation/digest-keyring';
import { DerivationKeyring } from '../auth/session-foundation/derivation-keyring';

export function validateEnvironment(config: Record<string, unknown>) {
  const environment =
    typeof config.NODE_ENV === 'string' ? config.NODE_ENV : 'development';
  const jwtSecret =
    typeof config.JWT_SECRET === 'string' ? config.JWT_SECRET : '';
  const encryptionKey =
    typeof config.PASS_SECRET_ENCRYPTION_KEY === 'string'
      ? config.PASS_SECRET_ENCRYPTION_KEY
      : '';
  const residentialTimeZone =
    typeof config.RESIDENTIAL_TIME_ZONE === 'string'
      ? config.RESIDENTIAL_TIME_ZONE
      : 'America/Guayaquil';

  if (environment !== 'test' && jwtSecret.length < 32) {
    throw new Error('JWT_SECRET must contain at least 32 characters');
  }
  if (environment !== 'test') {
    const decodedKey = Buffer.from(encryptionKey, 'base64');
    if (decodedKey.length !== 32) {
      throw new Error(
        'PASS_SECRET_ENCRYPTION_KEY must be a base64-encoded 32-byte key',
      );
    }
    const digestKeyring = parseKeyringEnvironment(
      config,
      'SESSION_DIGEST_KEYRING',
      'SESSION_DIGEST_ACTIVE_VERSION',
    );
    const derivationKeyring = parseKeyringEnvironment(
      config,
      'SESSION_DERIVATION_KEYRING',
      'SESSION_DERIVATION_ACTIVE_VERSION',
    );
    const digest = DigestKeyring.create(digestKeyring);
    DerivationKeyring.create({
      ...derivationKeyring,
      forbiddenKeyring: digest,
    });
    config = {
      ...config,
      SESSION_DIGEST_KEYRING: digestKeyring,
      SESSION_DERIVATION_KEYRING: derivationKeyring,
    };
  }
  try {
    new Intl.DateTimeFormat('en', { timeZone: residentialTimeZone }).format();
  } catch {
    throw new Error('RESIDENTIAL_TIME_ZONE must be a valid IANA time zone');
  }
  return { ...config, RESIDENTIAL_TIME_ZONE: residentialTimeZone };
}

function parseKeyringEnvironment(
  config: Record<string, unknown>,
  keyringName: string,
  activeVersionName: string,
): KeyringConfiguration {
  const encoded = config[keyringName];
  const activeVersion = config[activeVersionName];
  if (typeof encoded !== 'string' || typeof activeVersion !== 'string') {
    throw new Error(`default:${keyringName}`);
  }
  if (hasDuplicateJsonObjectKeys(encoded)) {
    throw new Error('duplicate:keyring');
  }
  try {
    const keys: unknown = JSON.parse(encoded);
    if (typeof keys !== 'object' || keys === null || Array.isArray(keys)) {
      throw new Error('invalid object');
    }
    return { activeVersion, keys: keys as Record<string, string> };
  } catch {
    throw new Error(`format:${keyringName}`);
  }
}

function hasDuplicateJsonObjectKeys(encoded: string): boolean {
  const keys = new Set<string>();
  for (let index = 0; index < encoded.length; index += 1) {
    if (encoded[index] !== '"') continue;
    let end = index + 1;
    while (end < encoded.length) {
      if (encoded[end] === '\\') end += 2;
      else if (encoded[end++] === '"') break;
    }
    const token = encoded.slice(index, end);
    let next = end;
    while (/\s/.test(encoded[next] ?? '')) next += 1;
    if (encoded[next] === ':') {
      const key = JSON.parse(token) as string;
      if (keys.has(key)) return true;
      keys.add(key);
    }
    index = end - 1;
  }
  return false;
}
