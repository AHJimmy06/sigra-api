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
});
