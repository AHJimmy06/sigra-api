import { AuthSession } from '../auth-session.entity';
import { RefreshOperation } from '../refresh-operation.entity';
import { DerivationKeyring } from './derivation-keyring';
import { DigestKeyring } from './digest-keyring';
import { SessionClassifier } from './classifier';
import { OperationFacts } from './types';

const DIGEST_KEY = Buffer.alloc(32, 1).toString('base64');
const DERIVATION_KEY = Buffer.alloc(32, 2).toString('base64');
const SESSION_ID = 'a0b1c2d3-e4f5-4678-9abc-def012345678';
const OPERATION_ID = 'b0b1c2d3-e4f5-4678-9abc-def012345678';

function fixtures() {
  const digests = DigestKeyring.create({
    activeVersion: 'digest-v1',
    keys: { 'digest-v1': DIGEST_KEY },
  });
  const derivations = DerivationKeyring.create({
    activeVersion: 'derive-v1',
    keys: { 'derive-v1': DERIVATION_KEY },
  });
  const session = Object.assign(new AuthSession(), {
    id: SESSION_ID,
    currentRefreshDigest: digests.digest('current-token').digest,
    currentDigestKeyVersion: 'digest-v1',
    currentGeneration: 4,
    currentDerivationKeyVersion: 'derive-v1',
  });
  const facts: OperationFacts = {
    sessionId: SESSION_ID,
    operationId: OPERATION_ID,
    presented: digests.digest('previous-token'),
    successor: {
      generation: 5,
      digestKeyVersion: 'digest-v1',
      derivationKeyVersion: 'derive-v1',
    },
    expiresAt: new Date('2030-01-01T00:00:00.000Z'),
  };
  const operation = Object.assign(new RefreshOperation(), {
    sessionId: SESSION_ID,
    operationId: OPERATION_ID,
    presentedDigest: facts.presented.digest,
    presentedDigestKeyVersion: facts.presented.version,
    resultGeneration: 5,
    resultDigestKeyVersion: 'digest-v1',
    resultDerivationKeyVersion: 'derive-v1',
  });
  return { digests, derivations, session, facts, operation };
}

describe('SessionClassifier', () => {
  it('orders retry, reconciliation, conflict, current, reuse, and invalid outcomes', () => {
    const { digests, derivations, session, facts, operation } = fixtures();
    const classifier = new SessionClassifier(digests, derivations);

    expect(classifier.classify(session, facts, [operation])).toMatchObject({
      kind: 'retry',
      operation,
    });
    const successor = derivations.derive('refresh', SESSION_ID, 5);
    const reconcileFacts = {
      ...facts,
      presented: digests.digest(successor.toString('base64url')),
    };
    expect(
      classifier.classify(session, reconcileFacts, [operation]),
    ).toMatchObject({
      kind: 'reconcile',
      operation,
    });
    expect(
      classifier.classify(session, { ...facts, sessionId: OPERATION_ID }, [
        operation,
      ]),
    ).toEqual({ kind: 'conflict', code: 'SESSION_MISMATCH' });
    expect(
      classifier.classify(
        session,
        { ...facts, presented: digests.digest('current-token') },
        [],
      ),
    ).toMatchObject({
      kind: 'current',
      session,
    });
    expect(
      classifier.classify(
        session,
        { ...facts, operationId: 'c0b1c2d3-e4f5-4678-9abc-def012345678' },
        [operation],
      ),
    ).toMatchObject({ kind: 'reuse', operation });
    expect(
      classifier.classify(
        session,
        { ...facts, presented: digests.digest('other-token') },
        [],
      ),
    ).toEqual({ kind: 'invalid' });
  });

  it('rejects a same-operation fact mismatch before current-digest mutation', () => {
    const { digests, derivations, session, facts, operation } = fixtures();
    const classifier = new SessionClassifier(digests, derivations);

    expect(
      classifier.classify(
        session,
        { ...facts, successor: { ...facts.successor, generation: 6 } },
        [operation],
      ),
    ).toEqual({ kind: 'conflict', code: 'SUCCESSOR_MISMATCH' });
  });

  it('returns reconstructed successor credentials and prefers current over retained reuse', () => {
    const { digests, derivations, session, facts, operation } = fixtures();
    const classifier = new SessionClassifier(digests, derivations);
    const successor = derivations.derive('refresh', SESSION_ID, 5);
    const credential = successor.toString('base64url');

    expect(classifier.classify(session, facts, [operation])).toMatchObject({
      kind: 'retry',
      credential,
    });
    expect(
      classifier.classify(
        session,
        { ...facts, presented: digests.digest(credential) },
        [operation],
      ),
    ).toMatchObject({ kind: 'reconcile', credential });
    expect(
      classifier.classify(
        session,
        {
          ...facts,
          operationId: 'c0b1c2d3-e4f5-4678-9abc-def012345678',
          presented: digests.digest('current-token'),
        },
        [
          Object.assign(new RefreshOperation(), {
            ...operation,
            operationId: 'd0b1c2d3-e4f5-4678-9abc-def012345678',
            presentedDigest: digests.digest('current-token').digest,
          }),
        ],
      ),
    ).toMatchObject({ kind: 'current', session });
  });
});
