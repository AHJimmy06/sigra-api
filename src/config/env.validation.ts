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
  }
  try {
    new Intl.DateTimeFormat('en', { timeZone: residentialTimeZone }).format();
  } catch {
    throw new Error('RESIDENTIAL_TIME_ZONE must be a valid IANA time zone');
  }
  return { ...config, RESIDENTIAL_TIME_ZONE: residentialTimeZone };
}
