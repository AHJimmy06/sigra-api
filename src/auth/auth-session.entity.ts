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
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../users/user.entity';

@Entity('auth_sessions')
@Check(
  'ck_auth_sessions_current_refresh_digest_length',
  'octet_length("current_refresh_digest") = 32',
)
@Check(
  'ck_auth_sessions_current_generation_nonnegative',
  '"current_generation" >= 0',
)
@Check(
  'ck_auth_sessions_current_digest_key_version_format',
  '"current_digest_key_version" COLLATE "C" ~ \'^[A-Za-z0-9._-]{1,32}$\'',
)
@Check(
  'ck_auth_sessions_current_derivation_key_version_format',
  '"current_derivation_key_version" COLLATE "C" ~ \'^[A-Za-z0-9._-]{1,32}$\'',
)
@Index('uq_auth_sessions_current_refresh_digest', ['currentRefreshDigest'], {
  unique: true,
})
@Index('idx_auth_sessions_user_revocation', [
  'userId',
  'revokedAt',
  'absoluteExpiresAt',
])
@Index('idx_auth_sessions_cleanup', ['absoluteExpiresAt', 'id'])
export class AuthSession {
  @PrimaryColumn({ type: 'uuid', default: () => 'gen_random_uuid()' })
  @Generated('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' }) userId!: string;

  @Column({ name: 'current_refresh_digest', type: 'bytea' })
  currentRefreshDigest!: Buffer;

  @Column({ name: 'current_digest_key_version', type: 'varchar', length: 32 })
  currentDigestKeyVersion!: string;

  @Column({ name: 'current_generation', type: 'integer' })
  currentGeneration!: number;

  @Column({
    name: 'current_derivation_key_version',
    type: 'varchar',
    length: 32,
  })
  currentDerivationKeyVersion!: string;

  @Column({ name: 'absolute_expires_at', type: 'timestamptz' })
  absoluteExpiresAt!: Date;

  @Column({ name: 'revoked_at', type: 'timestamptz', nullable: true })
  revokedAt!: Date | null;

  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamptz',
    default: () => 'now()',
  })
  createdAt!: Date;

  @UpdateDateColumn({
    name: 'updated_at',
    type: 'timestamptz',
    default: () => 'now()',
  })
  updatedAt!: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'user_id',
    foreignKeyConstraintName: 'fk_auth_sessions_user',
  })
  user!: User;
}
