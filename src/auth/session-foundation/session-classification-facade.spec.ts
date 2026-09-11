import { EntityManager } from 'typeorm';
import { AuthSession } from '../auth-session.entity';
import { RefreshOperation } from '../refresh-operation.entity';
import { DerivationKeyring } from './derivation-keyring';
import { DigestKeyring } from './digest-keyring';
import { SessionClassificationFacade } from './session-classification-facade';
import { OperationFacts } from './types';

const DIGEST_V1 = Buffer.alloc(32, 1).toString('base64');
const DIGEST_V2 = Buffer.alloc(32, 2).toString('base64');
const DERIVATION_KEY = Buffer.alloc(32, 3).toString('base64');
const SESSION_ID = 'a0b1c2d3-e4f5-4678-9abc-def012345678';
const OPERATION_ID = 'b0b1c2d3-e4f5-4678-9abc-def012345678';

describe('SessionClassificationFacade', () => {
  it('looks up all retained credential digests, locks their owner, and classifies retry without writes', async () => {
    const digestKeyring = DigestKeyring.create({
      activeVersion: 'digest-v2',
      keys: { 'digest-v1': DIGEST_V1, 'digest-v2': DIGEST_V2 },
    });
    const derivationKeyring = DerivationKeyring.create({
      activeVersion: 'derive-v1',
      keys: { 'derive-v1': DERIVATION_KEY },
    });
    const presented = digestKeyring.digest('retained-credential', 'digest-v1');
    const facts: OperationFacts = {
      sessionId: SESSION_ID,
      operationId: OPERATION_ID,
      presented,
      successor: {
        generation: 1,
        digestKeyVersion: 'digest-v2',
        derivationKeyVersion: 'derive-v1',
      },
      expiresAt: new Date('2030-01-01T00:00:00.000Z'),
    };
    const session = Object.assign(new AuthSession(), {
      id: SESSION_ID,
      currentRefreshDigest: digestKeyring.digest('current-credential').digest,
      currentDigestKeyVersion: 'digest-v2',
    });
    const operation = Object.assign(new RefreshOperation(), {
      sessionId: SESSION_ID,
      operationId: OPERATION_ID,
      presentedDigest: presented.digest,
      presentedDigestKeyVersion: presented.version,
      resultGeneration: 1,
      resultDigestKeyVersion: 'digest-v2',
      resultDerivationKeyVersion: 'derive-v1',
    });
    const query = jest
      .fn()
      .mockResolvedValueOnce([session])
      .mockResolvedValueOnce([operation]);
    const manager = { query } as unknown as EntityManager;

    await expect(
      new SessionClassificationFacade(
        digestKeyring,
        derivationKeyring,
      ).classifyPresentedCredential(manager, 'retained-credential', facts),
    ).resolves.toMatchObject({
      kind: 'retry',
      credential: derivationKeyring
        .derive('refresh', SESSION_ID, 1)
        .toString('base64url'),
    });
    expect(query).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('FOR UPDATE'),
      [
        expect.arrayContaining([
          digestKeyring.digest('retained-credential', 'digest-v1').digest,
          digestKeyring.digest('retained-credential', 'digest-v2').digest,
        ]),
      ],
    );
    expect(query).toHaveBeenCalledTimes(2);
  });
});
