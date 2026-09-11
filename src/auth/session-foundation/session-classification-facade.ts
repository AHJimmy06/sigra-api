import { EntityManager } from 'typeorm';
import { SessionClassifier } from './classifier';
import { DerivationKeyring } from './derivation-keyring';
import { DigestKeyring } from './digest-keyring';
import { RefreshOperationRepository } from './refresh-operation.repository';
import { SessionPrimitiveRepository } from './session.repository';
import { Classification, OperationFacts } from './types';

export class SessionClassificationFacade {
  private readonly sessions = new SessionPrimitiveRepository();
  private readonly operations = new RefreshOperationRepository();
  private readonly classifier: SessionClassifier;

  constructor(
    private readonly digestKeyring: DigestKeyring,
    derivationKeyring: DerivationKeyring,
  ) {
    this.classifier = new SessionClassifier(digestKeyring, derivationKeyring);
  }

  async classifyPresentedCredential(
    manager: EntityManager,
    credential: string,
    facts: OperationFacts,
  ): Promise<Classification> {
    const candidates = this.digestKeyring.candidates(credential);
    const presented = candidates.find(
      (candidate) =>
        candidate.version === facts.presented.version &&
        candidate.digest.equals(facts.presented.digest),
    );
    if (!presented) return { kind: 'invalid' };

    const locked = await this.sessions.findByPresentedCredential(
      manager,
      candidates,
    );
    if (!locked) return { kind: 'invalid' };
    return this.classifier.classifyLocked(
      locked,
      facts,
      await this.operations.findForLockedSession(
        manager,
        locked.id,
        facts.operationId,
      ),
    );
  }
}
