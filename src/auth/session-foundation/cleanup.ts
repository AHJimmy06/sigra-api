import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';

export type PurgeCount = {
  operations: number;
  sessions: number;
  total: number;
};

@Injectable()
export class SessionCleanup {
  async revokeSession(
    manager: EntityManager,
    sessionId: string,
    at: Date,
  ): Promise<number> {
    const result: unknown = await manager.query(
      `UPDATE auth_sessions
       SET revoked_at = COALESCE(revoked_at, $2)
       WHERE id = $1 AND revoked_at IS NULL
       RETURNING id`,
      [sessionId, at],
    );
    return rows(result, 'session-revocation-invalid-result').length;
  }

  async revokeUserSessions(
    manager: EntityManager,
    userId: string,
    at: Date,
  ): Promise<number> {
    const result: unknown = await manager.query(
      `UPDATE auth_sessions
       SET revoked_at = COALESCE(revoked_at, $2)
       WHERE user_id = $1 AND revoked_at IS NULL
       RETURNING id`,
      [userId, at],
    );
    return rows(result, 'user-revocation-invalid-result').length;
  }

  async purge(
    manager: EntityManager,
    cutoff: Date,
    limit: number,
  ): Promise<PurgeCount> {
    if (!Number.isInteger(limit) || limit <= 0) {
      throw new Error('purge-limit-positive-integer');
    }
    const operationResult: unknown = await manager.query(
      `WITH eligible AS (
         SELECT o.id
         FROM refresh_operations o
         LEFT JOIN auth_sessions s ON s.id = o.session_id
         WHERE o.expires_at <= $1
           AND (s.id IS NULL OR s.absolute_expires_at <= $1)
         ORDER BY o.expires_at, o.id
         FOR UPDATE OF o SKIP LOCKED
         LIMIT $2
       )
       DELETE FROM refresh_operations o
       USING eligible
       WHERE o.id = eligible.id
       RETURNING o.id`,
      [cutoff, limit],
    );
    const operations = rows(
      operationResult,
      'operation-purge-invalid-result',
    ).length;
    const remaining = limit - operations;
    if (remaining === 0) return { operations, sessions: 0, total: operations };

    const sessionResult: unknown = await manager.query(
      `WITH eligible AS (
         SELECT s.id
         FROM auth_sessions s
         WHERE s.absolute_expires_at <= $1
           AND NOT EXISTS (
             SELECT 1 FROM refresh_operations o WHERE o.session_id = s.id
           )
         ORDER BY s.absolute_expires_at, s.id
         FOR UPDATE OF s SKIP LOCKED
         LIMIT $2
       )
       DELETE FROM auth_sessions s
       USING eligible
       WHERE s.id = eligible.id
       RETURNING s.id`,
      [cutoff, remaining],
    );
    const sessions = rows(sessionResult, 'session-purge-invalid-result').length;
    return { operations, sessions, total: operations + sessions };
  }
}

function rows(result: unknown, error: string): unknown[] {
  if (!Array.isArray(result)) throw new Error(error);
  if (Array.isArray(result[0])) return result[0];
  return result;
}
