import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { authenticator } from 'otplib';
import { Repository } from 'typeorm';
import { DataSource } from 'typeorm';
import { createHash } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import { AuditService } from '../audit/audit.service';
import { AuthUser } from '../auth/auth.types';
import { Resident } from '../residents/resident.entity';
import {
  AccessDirection,
  AccessEvent,
  AccessDecision,
} from './access-event.entity';
import { AccessPass } from './access-pass.entity';
import { AccessEventQueryDto, QrPayloadV1 } from './access.dto';
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
    private readonly dataSource: DataSource,
    private readonly audit: AuditService,
    private readonly config: ConfigService,
  ) {}

  async listEvents(params: AccessEventQueryDto) {
    const query = this.events
      .createQueryBuilder('event')
      .leftJoinAndSelect('event.resident', 'resident')
      .leftJoinAndSelect('event.unit', 'unit')
      .leftJoinAndSelect('event.guard', 'guard');
    const timeZone = this.config.get<string>(
      'RESIDENTIAL_TIME_ZONE',
      'America/Guayaquil',
    );
    const from = params.from
      ? lowerDateBound(params.from, timeZone)
      : undefined;
    const to = params.to ? upperDateBound(params.to, timeZone) : undefined;
    if (from && to && (from > to.value || (to.exclusive && from >= to.value))) {
      throw new BadRequestException('Invalid access event date range');
    }
    if (from) query.andWhere('event.occurredAt >= :from', { from });
    if (to) {
      query.andWhere(`event.occurredAt ${to.exclusive ? '<' : '<='} :to`, {
        to: to.value,
      });
    }
    if (params.decision) {
      query.andWhere('event.decision = :decision', {
        decision: params.decision,
      });
    }
    if (params.direction) {
      query.andWhere('event.direction = :direction', {
        direction: params.direction,
      });
    }
    if (params.search) {
      query.andWhere(
        '(resident.name ILIKE :search OR unit.code ILIKE :search OR guard.email ILIKE :search)',
        { search: `%${params.search}%` },
      );
    }
    query
      .orderBy('event.occurredAt', 'DESC')
      .addOrderBy('event.id', 'DESC')
      .skip((params.page - 1) * params.pageSize)
      .take(params.pageSize);
    const [events, total] = await query.getManyAndCount();
    return {
      items: events.map((event) => ({
        id: event.id,
        decision: event.decision,
        reason: event.reason,
        direction: event.direction,
        occurredAt: event.occurredAt.toISOString(),
        requestId: event.requestId,
        resident: event.resident
          ? { name: event.resident.name, unitCode: event.unit?.code ?? null }
          : null,
        guard: { email: event.guard.email },
      })),
      total,
      page: params.page,
      pageSize: params.pageSize,
    };
  }

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
    actor: AuthUser,
    requestId: string,
    ip?: string,
  ) {
    const requestFingerprint = fingerprintValidationRequest(
      qrPayload,
      direction,
      actor.sub,
    );
    const existing = await this.events.findOneBy({ clientEventId });
    if (existing) {
      assertCompatibleRetry(existing, requestFingerprint);
      return this.toValidationResponse(existing);
    }
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
      const event = await this.dataSource.transaction(async (manager) => {
        const events = manager.getRepository(AccessEvent);
        const saved = await events.save(
          events.create({
            clientEventId,
            requestFingerprint,
            requestId,
            guardId: actor.sub,
            direction,
            decision,
            reason,
            passId: persistedPassId,
            residentId,
            unitId,
          }),
        );
        await this.audit.record(manager, {
          actor,
          action: 'ACCESS_VALIDATED',
          resourceType: 'ACCESS_EVENT',
          resourceId: saved.id,
          ip,
          metadata: {
            clientEventId,
            decision,
            direction,
            reason,
            residentId,
            unitId,
            requestId,
          },
        });
        return saved;
      });
      return this.toValidationResponse(event);
    } catch (error) {
      const duplicate = await this.events.findOneBy({ clientEventId });
      if (duplicate) {
        assertCompatibleRetry(duplicate, requestFingerprint);
        return this.toValidationResponse(duplicate);
      }
      throw error;
    }
  }
  private toValidationResponse(event: AccessEvent) {
    return {
      id: event.id,
      decision: event.decision,
      reason: event.reason,
      direction: event.direction,
      occurredAt: event.occurredAt.toISOString(),
      requestId: event.requestId,
    };
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

function lowerDateBound(value: string, timeZone: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? startOfDateInTimeZone(value, timeZone)
    : new Date(value);
}

function upperDateBound(value: string, timeZone: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const nextDate = new Date(`${value}T00:00:00.000Z`);
    nextDate.setUTCDate(nextDate.getUTCDate() + 1);
    return {
      value: startOfDateInTimeZone(
        nextDate.toISOString().slice(0, 10),
        timeZone,
      ),
      exclusive: true,
    };
  }
  return { value: new Date(value), exclusive: false };
}

function startOfDateInTimeZone(value: string, timeZone: string) {
  const [year, month, day] = value.split('-').map(Number);
  const expectedUtc = Date.UTC(year, month - 1, day);
  let candidate = expectedUtc;
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const parts = Object.fromEntries(
      formatter
        .formatToParts(new Date(candidate))
        .filter((part) => part.type !== 'literal')
        .map((part) => [part.type, Number(part.value)]),
    );
    const representedUtc = Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour,
      parts.minute,
      parts.second,
    );
    candidate += expectedUtc - representedUtc;
  }
  return new Date(candidate);
}

function fingerprintValidationRequest(
  qrPayload: string,
  direction: AccessDirection,
  guardId: string,
) {
  return createHash('sha256')
    .update(JSON.stringify({ direction, guardId, qrPayload }))
    .digest('hex');
}

function assertCompatibleRetry(event: AccessEvent, fingerprint: string) {
  if (event.requestFingerprint === fingerprint) return;
  throw new ConflictException({
    message:
      'Client event ID was already used for a different validation request',
    details: {
      clientEventId: [
        'clientEventId must identify exactly one validation request',
      ],
    },
  });
}
