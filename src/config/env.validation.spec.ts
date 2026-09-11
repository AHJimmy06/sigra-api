import { validateEnvironment } from './env.validation';

describe('environment validation', () => {
  it('defaults the residential time zone explicitly', () => {
    expect(validateEnvironment({ NODE_ENV: 'test' })).toMatchObject({
      RESIDENTIAL_TIME_ZONE: 'America/Guayaquil',
    });
  });

  it('accepts valid IANA zones and rejects invalid values', () => {
    expect(
      validateEnvironment({
        NODE_ENV: 'test',
        RESIDENTIAL_TIME_ZONE: 'Europe/Madrid',
      }),
    ).toMatchObject({ RESIDENTIAL_TIME_ZONE: 'Europe/Madrid' });
    expect(() =>
      validateEnvironment({
        NODE_ENV: 'test',
        RESIDENTIAL_TIME_ZONE: 'not/a-zone',
      }),
    ).toThrow('RESIDENTIAL_TIME_ZONE must be a valid IANA time zone');
  });

  it('requires independent session keyring configuration outside tests', () => {
    expect(() =>
      validateEnvironment({
        NODE_ENV: 'production',
        JWT_SECRET: 'a'.repeat(32),
        PASS_SECRET_ENCRYPTION_KEY: Buffer.alloc(32).toString('base64'),
        SESSION_DIGEST_KEYRING: JSON.stringify({
          v1: Buffer.alloc(32, 1).toString('base64'),
        }),
        SESSION_DIGEST_ACTIVE_VERSION: 'v1',
        SESSION_DERIVATION_KEYRING: JSON.stringify({
          v1: Buffer.alloc(32, 2).toString('base64'),
        }),
        SESSION_DERIVATION_ACTIVE_VERSION: 'v1',
      }),
    ).not.toThrow();
    expect(() =>
      validateEnvironment({
        NODE_ENV: 'production',
        JWT_SECRET: 'a'.repeat(32),
        PASS_SECRET_ENCRYPTION_KEY: Buffer.alloc(32).toString('base64'),
        SESSION_DIGEST_KEYRING: JSON.stringify({
          v1: Buffer.alloc(32, 1).toString('base64'),
        }),
        SESSION_DIGEST_ACTIVE_VERSION: 'v1',
        SESSION_DERIVATION_KEYRING: JSON.stringify({
          v1: Buffer.alloc(32, 1).toString('base64'),
        }),
        SESSION_DERIVATION_ACTIVE_VERSION: 'v1',
      }),
    ).toThrow('keyring-separation');
  });

  it('rejects duplicate serialized session keyring versions before JSON parsing collapses them', () => {
    expect(() =>
      validateEnvironment({
        NODE_ENV: 'production',
        JWT_SECRET: 'a'.repeat(32),
        PASS_SECRET_ENCRYPTION_KEY: Buffer.alloc(32).toString('base64'),
        SESSION_DIGEST_KEYRING: `{"v1":"${Buffer.alloc(32, 1).toString('base64')}","v1":"${Buffer.alloc(32, 2).toString('base64')}"}`,
        SESSION_DIGEST_ACTIVE_VERSION: 'v1',
        SESSION_DERIVATION_KEYRING: JSON.stringify({
          v1: Buffer.alloc(32, 3).toString('base64'),
        }),
        SESSION_DERIVATION_ACTIVE_VERSION: 'v1',
      }),
    ).toThrow('duplicate:keyring');
  });
});
