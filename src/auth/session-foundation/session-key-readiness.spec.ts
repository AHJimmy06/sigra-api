import { SessionKeyReadiness } from './session-key-readiness';

const versions = {
  currentDigest: ['digest-v1'],
  presentedDigest: ['digest-v1'],
  resultDigest: ['digest-v1'],
  currentDerivation: ['derive-v1'],
  resultDerivation: ['derive-v1'],
};

describe('SessionKeyReadiness', () => {
  it('resolves every persisted HMAC and HKDF version after data source initialization', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce(versions.currentDigest.map(versionRow))
      .mockResolvedValueOnce(versions.presentedDigest.map(versionRow))
      .mockResolvedValueOnce(versions.resultDigest.map(versionRow))
      .mockResolvedValueOnce(versions.currentDerivation.map(versionRow))
      .mockResolvedValueOnce(versions.resultDerivation.map(versionRow));
    const readiness = new SessionKeyReadiness(
      { query } as never,
      keyring(['digest-v1']),
      keyring(['derive-v1']),
    );

    await expect(readiness.onApplicationBootstrap()).resolves.toBeUndefined();
    expect(query).toHaveBeenCalledTimes(5);
  });

  it('identifies the unresolved persisted column and version before serving', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce([versionRow('retained-digest')])
      .mockResolvedValue([]);
    const readiness = new SessionKeyReadiness(
      { query } as never,
      keyring(['digest-v1']),
      keyring(['derive-v1']),
    );

    await expect(readiness.onApplicationBootstrap()).rejects.toThrow(
      'unresolved-persisted-version:auth_sessions.current_digest_key_version:retained-digest',
    );
  });
});

function keyring(versions: string[]) {
  return { has: (version: string) => versions.includes(version) };
}

function versionRow(version: string) {
  return { version };
}
