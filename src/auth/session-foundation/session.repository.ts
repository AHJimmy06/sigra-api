import { EntityManager } from 'typeorm';
import { AuthSession } from '../auth-session.entity';
import { Digest } from './digest-keyring';

export class SessionPrimitiveRepository {
  lockById(manager: EntityManager, id: string): Promise<AuthSession | null> {
    return manager
      .query(
        `SELECT id, user_id AS "userId", current_refresh_digest AS "currentRefreshDigest",
         current_digest_key_version AS "currentDigestKeyVersion",
         current_generation AS "currentGeneration",
         current_derivation_key_version AS "currentDerivationKeyVersion",
         absolute_expires_at AS "absoluteExpiresAt", revoked_at AS "revokedAt"
         FROM auth_sessions WHERE id = $1 FOR UPDATE`,
        [id],
      )
      .then((rows: AuthSession[]) => rows[0] ?? null);
  }

  findByPresentedDigest(
    manager: EntityManager,
    digests: readonly Buffer[],
  ): Promise<AuthSession | null> {
    if (digests.length === 0) return Promise.resolve(null);
    return manager
      .query(
        `SELECT id, user_id AS "userId", current_refresh_digest AS "currentRefreshDigest",
         current_digest_key_version AS "currentDigestKeyVersion",
         current_generation AS "currentGeneration",
         current_derivation_key_version AS "currentDerivationKeyVersion",
         absolute_expires_at AS "absoluteExpiresAt", revoked_at AS "revokedAt"
         FROM auth_sessions WHERE current_refresh_digest = ANY($1) FOR UPDATE`,
        [digests],
      )
      .then((rows: AuthSession[]) => rows[0] ?? null);
  }

  findByPresentedCredential(
    manager: EntityManager,
    candidates: readonly Digest[],
  ): Promise<AuthSession | null> {
    if (candidates.length === 0) return Promise.resolve(null);
    return manager
      .query(
        `SELECT s.id, s.user_id AS "userId", s.current_refresh_digest AS "currentRefreshDigest",
         s.current_digest_key_version AS "currentDigestKeyVersion",
         s.current_generation AS "currentGeneration",
         s.current_derivation_key_version AS "currentDerivationKeyVersion",
         s.absolute_expires_at AS "absoluteExpiresAt", s.revoked_at AS "revokedAt"
         FROM auth_sessions s
         WHERE s.current_refresh_digest = ANY($1) OR EXISTS (
           SELECT 1 FROM refresh_operations o
           WHERE o.session_id = s.id AND o.presented_digest = ANY($1)
         )
         FOR UPDATE OF s`,
        [candidates.map((candidate) => candidate.digest)],
      )
      .then((rows: AuthSession[]) => rows[0] ?? null);
  }
}
