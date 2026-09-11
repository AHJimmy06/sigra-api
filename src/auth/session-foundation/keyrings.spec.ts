import { DerivationKeyring } from './derivation-keyring';
import { DigestKeyring } from './digest-keyring';

const DIGEST_KEY = Buffer.alloc(32, 1).toString('base64');
const DERIVATION_KEY = Buffer.alloc(32, 2).toString('base64');
const SESSION_ID = 'A0B1C2D3-E4F5-4678-9ABC-DEF012345678';

describe('session keyrings', () => {
  it('produces the versioned canonical HMAC-SHA256 digest vector', () => {
    const keyring = DigestKeyring.create({
      activeVersion: 'v1',
      keys: { v1: DIGEST_KEY },
    });

    expect(keyring.digest('credential-value')).toEqual({
      version: 'v1',
      digest: Buffer.from(
        'bf81dd1cada0597818fa549b74addc2db00053c2dac78d92be7cb2b9b5914298',
        'hex',
      ),
    });
    expect(keyring.digest('credential-value', 'v1')).toEqual(
      keyring.digest('credential-value'),
    );
  });

  it('rejects non-canonical credentials and unresolved versions', () => {
    const keyring = DigestKeyring.create({
      activeVersion: 'v1',
      keys: { v1: DIGEST_KEY },
    });

    expect(() => keyring.digest('not canonical=')).toThrow('format');
    expect(() => keyring.digest('credential-value', 'missing')).toThrow(
      'active-version',
    );
  });

  it('derives distinct refresh and csrf vectors with canonical session facts', () => {
    const keyring = DerivationKeyring.create({
      activeVersion: 'derive-v1',
      keys: { 'derive-v1': DERIVATION_KEY },
    });

    expect(keyring.derive('refresh', SESSION_ID, 7)).toEqual(
      Buffer.from(
        '1db12ec54cc7ae178450e6df6b232cf70e8295fc8705632435828e4bc8869289',
        'hex',
      ),
    );
    expect(keyring.derive('csrf', SESSION_ID, 7)).not.toEqual(
      keyring.derive('refresh', SESSION_ID, 7),
    );
  });

  it('rejects duplicate, undersized, and cross-domain keyring configuration', () => {
    expect(() =>
      DigestKeyring.create({
        activeVersion: 'v1',
        keys: { v1: Buffer.alloc(31).toString('base64') },
      }),
    ).toThrow('key-length');
    expect(() =>
      DerivationKeyring.create({
        activeVersion: 'v1',
        keys: { v1: DIGEST_KEY },
        forbiddenKeyring: DigestKeyring.create({
          activeVersion: 'v1',
          keys: { v1: DIGEST_KEY },
        }),
      }),
    ).toThrow('keyring-separation');
  });
});
