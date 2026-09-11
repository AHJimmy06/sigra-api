import { AuthSession } from '../auth-session.entity';
import { RefreshOperation } from '../refresh-operation.entity';
import { Digest } from './digest-keyring';

export type SuccessorFacts = {
  generation: number;
  digestKeyVersion: string;
  derivationKeyVersion: string;
};

export type OperationFacts = {
  sessionId: string;
  operationId: string;
  presented: Digest;
  successor: SuccessorFacts;
  expiresAt: Date;
};

export type Classification =
  | {
      kind: 'retry' | 'reconcile';
      operation: RefreshOperation;
      successor: SuccessorFacts;
      credential: string;
    }
  | { kind: 'current'; session: AuthSession }
  | { kind: 'reuse'; session: AuthSession; operation: RefreshOperation }
  | {
      kind: 'conflict';
      code: 'SESSION_MISMATCH' | 'OPERATION_MISMATCH' | 'SUCCESSOR_MISMATCH';
    }
  | { kind: 'invalid' };

export type RecordResult =
  | { kind: 'recorded'; operation: RefreshOperation }
  | { kind: 'existing'; operation: RefreshOperation };
