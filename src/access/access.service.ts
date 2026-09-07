import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { authenticator } from 'otplib';
import { Repository } from 'typeorm';
import { Resident } from '../residents/resident.entity';
import {
  AccessDirection,
  AccessEvent,
  AccessDecision,
} from './access-event.entity';
import { AccessPass } from './access-pass.entity';
import { QrPayloadV1 } from './access.dto';
import { SecretCryptoService } from './secret-crypto.service';

@Injectable()
export class AccessService {
  constructor(
    @InjectRepository(AccessPass)
    private readonly passes: Repository<AccessPass>,
    @InjectRepository(AccessEvent)
    private readonly events: Repository<AccessEvent>,
    @InjectRepository(Resident)
    private readonly residents: Repository<Resident>,
    private readonly crypto: SecretCryptoService,
  ) {}

  async createPass(residentId: string, validDays: number) {
    const resident = await this.residents.findOneBy({
      id: residentId,
      active: true,
    });
    if (!resident) throw new NotFoundException('Active resident not found');
    const secret = authenticator.generateSecret();
    const pass = await this.passes.save(
      this.passes.create({
        residentId,
        encryptedSecret: this.crypto.encrypt(secret),
        validUntil: new Date(Date.now() + validDays * 86_400_000),
        revokedAt: null,
      }),
    );
    return this.toPublic(pass);
  }
  async listPasses(residentId: string) {
    const passes = await this.passes.find({
      where: { residentId },
      order: { createdAt: 'DESC' },
    });
    return passes.map((pass) => this.toPublic(pass));
  }
  async revoke(residentId: string, id: string) {
    const pass = await this.passes.findOneBy({ id, residentId });
    if (!pass) throw new NotFoundException('Pass not found');
    pass.revokedAt = new Date();
    await this.passes.save(pass);
  }
  async currentQr(residentId: string, id: string) {
    const pass = await this.passes.findOneBy({ id, residentId });
    if (!pass || pass.revokedAt || pass.validUntil <= new Date())
      throw new NotFoundException('Active pass not found');
    const payload: QrPayloadV1 = {
      v: 1,
      passId: pass.id,
      token: authenticator.generate(this.crypto.decrypt(pass.encryptedSecret)),
    };
    return {
      payload: JSON.stringify(payload),
      expiresInSeconds: 30,
      contract: 'sigra.access.v1',
    };
  }
  async validate(
    qrPayload: string,
    clientEventId: string,
    direction: AccessDirection,
    guardId: string,
  ) {
    const existing = await this.events.findOneBy({ clientEventId });
    if (existing) return existing;
    let payload: QrPayloadV1 | null = null;
    let persistedPassId: string | null = null;
    let residentId: string | null = null;
    let unitId: string | null = null;
    let decision = AccessDecision.DENIED;
    let reason = 'INVALID_QR';
    try {
      payload = JSON.parse(qrPayload) as QrPayloadV1;
      if (payload.v !== 1 || !payload.passId || !/^\d{6}$/.test(payload.token))
        throw new Error('contract');
      const pass = await this.passes.findOneBy({ id: payload.passId });
      if (!pass) reason = 'PASS_NOT_FOUND';
      else {
        persistedPassId = pass.id;
        residentId = pass.residentId;
        unitId = pass.resident.unitId;
        if (pass.revokedAt) reason = 'PASS_REVOKED';
        else if (pass.validUntil <= new Date()) reason = 'PASS_EXPIRED';
        else if (!pass.resident.active || !pass.resident.unit.active)
          reason = 'ACCESS_REVOKED';
        else {
          const verifier = authenticator.clone();
          verifier.options = { window: 1 };
          const valid = verifier.check(
            payload.token,
            this.crypto.decrypt(pass.encryptedSecret),
          );
          if (valid) {
            decision = AccessDecision.ALLOWED;
            reason = 'VALID_PASS';
          } else reason = 'INVALID_OR_EXPIRED_TOKEN';
        }
      }
    } catch {
      payload = null;
    }
    try {
      return await this.events.save(
        this.events.create({
          clientEventId,
          guardId,
          direction,
          decision,
          reason,
          passId: persistedPassId,
          residentId,
          unitId,
        }),
      );
    } catch (error) {
      const duplicate = await this.events.findOneBy({ clientEventId });
      if (duplicate) return duplicate;
      throw error;
    }
  }
  private toPublic(pass: AccessPass) {
    return {
      id: pass.id,
      residentId: pass.residentId,
      validUntil: pass.validUntil,
      revokedAt: pass.revokedAt,
      createdAt: pass.createdAt,
    };
  }
}
