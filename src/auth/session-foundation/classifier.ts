import { timingSafeEqual } from 'node:crypto';
import { AuthSession } from '../auth-session.entity';
import { RefreshOperation } from '../refresh-operation.entity';
import { DerivationKeyring } from './derivation-keyring';
import { DigestKeyring } from './digest-keyring';
import { Classification, OperationFacts } from './types';

function equal(left: Buffer, right: Buffer): boolean {
  return left.length === right.length && timingSafeEqual(left, right);
}

export class SessionClassifier {
  constructor(
    private readonly digestKeyring: DigestKeyring,
    private readonly derivationKeyring: DerivationKeyring,
  ) {}

  classify(
    session: AuthSession,
    facts: OperationFacts,
    operations: RefreshOperation[],
  ): Classification {
    if (session.id !== facts.sessionId) {
      return { kind: 'conflict', code: 'SESSION_MISMATCH' };
    }
    const sameOperation = operations.find(
      (operation) => operation.operationId === facts.operationId,
    );
    if (sameOperation) {
      if (sameOperation.sessionId !== session.id) {
        return { kind: 'conflict', code: 'SESSION_MISMATCH' };
      }
      if (
        equal(sameOperation.presentedDigest, facts.presented.digest) &&
        sameOperation.presentedDigestKeyVersion === facts.presented.version &&
        sameOperation.resultGeneration === facts.successor.generation &&
        sameOperation.resultDigestKeyVersion ===
          facts.successor.digestKeyVersion &&
        sameOperation.resultDerivationKeyVersion ===
          facts.successor.derivationKeyVersion
      ) {
        return {
          kind: 'retry',
          operation: sameOperation,
          successor: facts.successor,
          credential: this.successorCredential(session, sameOperation),
        };
      }
      const credential = this.successorCredential(session, sameOperation);
      const result = this.digestKeyring.digest(
        credential,
        sameOperation.resultDigestKeyVersion,
      );
      if (
        equal(result.digest, facts.presented.digest) &&
        facts.presented.version === sameOperation.resultDigestKeyVersion &&
        sameOperation.resultGeneration === facts.successor.generation &&
        sameOperation.resultDigestKeyVersion ===
          facts.successor.digestKeyVersion &&
        sameOperation.resultDerivationKeyVersion ===
          facts.successor.derivationKeyVersion
      ) {
        return {
          kind: 'reconcile',
          operation: sameOperation,
          successor: facts.successor,
          credential,
        };
      }
      return { kind: 'conflict', code: 'SUCCESSOR_MISMATCH' };
    }
    if (
      equal(session.currentRefreshDigest, facts.presented.digest) &&
      session.currentDigestKeyVersion === facts.presented.version
    )
      return { kind: 'current', session };
    const retained = operations.find((operation) =>
      equal(operation.presentedDigest, facts.presented.digest),
    );
    if (retained) return { kind: 'reuse', session, operation: retained };
    return { kind: 'invalid' };
  }

  classifyLocked(
    session: AuthSession,
    facts: OperationFacts,
    operations: RefreshOperation[],
  ): Classification {
    return this.classify(session, facts, operations);
  }

  private successorCredential(
    session: AuthSession,
    operation: RefreshOperation,
  ): string {
    return this.derivationKeyring
      .derive(
        'refresh',
        session.id,
        operation.resultGeneration,
        operation.resultDerivationKeyVersion,
      )
      .toString('base64url');
  }
}
