import { EntityManager } from 'typeorm';
import { RefreshOperation } from '../refresh-operation.entity';
import { Classification, OperationFacts, RecordResult } from './types';

export class RefreshOperationRepository {
  async findForLockedSession(
    manager: EntityManager,
    sessionId: string,
    operationId: string,
  ): Promise<RefreshOperation[]> {
    return manager.query(
      `SELECT id, session_id AS "sessionId", operation_id AS "operationId",
       presented_digest AS "presentedDigest",
       presented_digest_key_version AS "presentedDigestKeyVersion",
       result_generation AS "resultGeneration",
       result_digest_key_version AS "resultDigestKeyVersion",
       result_derivation_key_version AS "resultDerivationKeyVersion",
       expires_at AS "expiresAt", created_at AS "createdAt"
       FROM refresh_operations WHERE session_id = $1 OR operation_id = $2 FOR UPDATE`,
      [sessionId, operationId],
    );
  }

  async recordOrRead(
    manager: EntityManager,
    facts: OperationFacts,
  ): Promise<RecordResult> {
    const insertResult: unknown = await manager.query(
      `INSERT INTO refresh_operations (session_id, operation_id, presented_digest,
       presented_digest_key_version, result_generation, result_digest_key_version,
       result_derivation_key_version, expires_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT (session_id, operation_id) DO NOTHING RETURNING *`,
      [
        facts.sessionId,
        facts.operationId,
        facts.presented.digest,
        facts.presented.version,
        facts.successor.generation,
        facts.successor.digestKeyVersion,
        facts.successor.derivationKeyVersion,
        facts.expiresAt,
      ],
    );
    if (!Array.isArray(insertResult)) {
      throw new Error('operation-insert-invalid-result');
    }
    const rows = insertResult as RefreshOperation[];
    if (rows.length > 0) {
      return { kind: 'recorded', operation: rows[0] };
    }
    const rereadResult: unknown = await manager.query(
      `SELECT id, session_id AS "sessionId", operation_id AS "operationId",
       presented_digest AS "presentedDigest",
       presented_digest_key_version AS "presentedDigestKeyVersion",
       result_generation AS "resultGeneration",
       result_digest_key_version AS "resultDigestKeyVersion",
       result_derivation_key_version AS "resultDerivationKeyVersion",
       expires_at AS "expiresAt", created_at AS "createdAt"
       FROM refresh_operations WHERE session_id = $1 AND operation_id = $2 FOR UPDATE`,
      [facts.sessionId, facts.operationId],
    );
    if (!Array.isArray(rereadResult)) {
      throw new Error('operation-reread-invalid-result');
    }
    const operation = rereadResult[0] as RefreshOperation | undefined;
    if (!operation) throw new Error('operation-conflict-reread-missing');
    return { kind: 'existing', operation };
  }

  async recordOrReclassify(
    manager: EntityManager,
    facts: OperationFacts,
    classify: (operations: RefreshOperation[]) => Classification,
  ): Promise<RecordResult | Classification> {
    const result = await this.recordOrRead(manager, facts);
    if (result.kind === 'recorded') return result;
    return classify(
      await this.findForLockedSession(
        manager,
        facts.sessionId,
        facts.operationId,
      ),
    );
  }
}
