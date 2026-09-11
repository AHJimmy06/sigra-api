import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Generated,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { AuthSession } from './auth-session.entity';

@Entity('refresh_operations')
@Check(
  'ck_refresh_operations_presented_digest_length',
  'octet_length("presented_digest") = 32',
)
@Check(
  'ck_refresh_operations_result_generation_nonnegative',
  '"result_generation" >= 0',
)
@Check(
  'ck_refresh_operations_presented_digest_key_version_format',
  '"presented_digest_key_version" COLLATE "C" ~ \'^[A-Za-z0-9._-]{1,32}$\'',
)
@Check(
  'ck_refresh_operations_result_digest_key_version_format',
  '"result_digest_key_version" COLLATE "C" ~ \'^[A-Za-z0-9._-]{1,32}$\'',
)
@Check(
  'ck_refresh_operations_result_derivation_key_version_format',
  '"result_derivation_key_version" COLLATE "C" ~ \'^[A-Za-z0-9._-]{1,32}$\'',
)
@Index(
  'uq_refresh_operations_session_operation',
  ['sessionId', 'operationId'],
  {
    unique: true,
  },
)
@Index('idx_refresh_operations_presented_digest', ['presentedDigest'])
@Index('idx_refresh_operations_cleanup', ['expiresAt', 'id'])
export class RefreshOperation {
  @PrimaryColumn({ type: 'uuid', default: () => 'gen_random_uuid()' })
  @Generated('uuid')
  id!: string;

  @Column({ name: 'session_id', type: 'uuid' }) sessionId!: string;

  @Column({ name: 'operation_id', type: 'uuid' }) operationId!: string;

  @Column({ name: 'presented_digest', type: 'bytea' }) presentedDigest!: Buffer;

  @Column({ name: 'presented_digest_key_version', type: 'varchar', length: 32 })
  presentedDigestKeyVersion!: string;

  @Column({ name: 'result_generation', type: 'integer' })
  resultGeneration!: number;

  @Column({ name: 'result_digest_key_version', type: 'varchar', length: 32 })
  resultDigestKeyVersion!: string;

  @Column({
    name: 'result_derivation_key_version',
    type: 'varchar',
    length: 32,
  })
  resultDerivationKeyVersion!: string;

  @Column({ name: 'expires_at', type: 'timestamptz' }) expiresAt!: Date;

  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamptz',
    default: () => 'now()',
  })
  createdAt!: Date;

  @ManyToOne(() => AuthSession, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'session_id',
    foreignKeyConstraintName: 'fk_refresh_operations_session',
  })
  session!: AuthSession;
}
