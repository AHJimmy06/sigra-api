import type { ColumnMetadata } from 'typeorm/metadata/ColumnMetadata';
import dataSource from './typeorm.datasource';
import { AddAuditLogs1724600001000 } from '../migrations/1724600001000-AddAuditLogs';

type MetadataBuildableDataSource = typeof dataSource & {
  buildMetadatas(): Promise<void>;
};

function columnShape(column: ColumnMetadata) {
  return {
    name: column.databaseName,
    type: column.type,
    nullable: column.isNullable,
    primary: column.isPrimary,
    enumName: column.enumName,
  };
}

describe('PostgreSQL entity metadata', () => {
  beforeAll(async () => {
    await (dataSource as MetadataBuildableDataSource).buildMetadatas();
  });

  it('constructs production entity metadata without a database connection', () => {
    expect(dataSource.entityMetadatas.length).toBeGreaterThan(0);
    expect(dataSource.options.type).toBe('postgres');
    expect(dataSource.isInitialized).toBe(false);
  });

  it('maps every audit column to the migration schema', async () => {
    const metadata = dataSource.getMetadata('audit_logs');
    expect(metadata.columns.map(columnShape)).toEqual([
      {
        name: 'audit_id',
        type: 'uuid',
        nullable: false,
        primary: true,
        enumName: undefined,
      },
      {
        name: 'actor_user_id',
        type: 'uuid',
        nullable: true,
        primary: false,
        enumName: undefined,
      },
      {
        name: 'actor_role',
        type: 'enum',
        nullable: true,
        primary: false,
        enumName: 'user_role',
      },
      {
        name: 'action',
        type: 'varchar',
        nullable: false,
        primary: false,
        enumName: undefined,
      },
      {
        name: 'resource_type',
        type: 'varchar',
        nullable: false,
        primary: false,
        enumName: undefined,
      },
      {
        name: 'resource_id',
        type: 'uuid',
        nullable: true,
        primary: false,
        enumName: undefined,
      },
      {
        name: 'metadata',
        type: 'jsonb',
        nullable: false,
        primary: false,
        enumName: undefined,
      },
      {
        name: 'ip',
        type: 'varchar',
        nullable: true,
        primary: false,
        enumName: undefined,
      },
      {
        name: 'created_at',
        type: 'timestamptz',
        nullable: false,
        primary: false,
        enumName: undefined,
      },
    ]);

    const queries: string[] = [];
    await new AddAuditLogs1724600001000().up({
      query: (sql: string) => {
        queries.push(sql);
        return Promise.resolve();
      },
    } as never);
    const createAuditTable = queries.find((sql) =>
      sql.startsWith('CREATE TABLE "audit_logs"'),
    );
    expect(createAuditTable).toBe(
      `CREATE TABLE "audit_logs" ("audit_id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "actor_user_id" uuid REFERENCES "users"("id") ON DELETE RESTRICT, "actor_role" "user_role", "action" varchar NOT NULL, "resource_type" varchar NOT NULL, "resource_id" uuid, "metadata" jsonb NOT NULL DEFAULT '{}', "ip" varchar, "created_at" timestamptz NOT NULL DEFAULT now())`,
    );
  });

  it('aligns all Phase 0 entity columns added by the migration', () => {
    const announcement = dataSource.getMetadata('announcements');
    expect(
      columnShape(announcement.findColumnWithPropertyName('status')!),
    ).toMatchObject({
      name: 'status',
      type: 'enum',
      nullable: false,
      enumName: 'announcement_status',
    });
    expect(
      columnShape(announcement.findColumnWithPropertyName('authorUserId')!),
    ).toMatchObject({
      name: 'author_user_id',
      type: 'uuid',
      nullable: true,
    });

    const ticket = dataSource.getMetadata('maintenance_tickets');
    expect(
      columnShape(ticket.findColumnWithPropertyName('priority')!),
    ).toMatchObject({
      name: 'priority',
      type: 'enum',
      nullable: false,
      enumName: 'ticket_priority',
    });

    const accessEvent = dataSource.getMetadata('access_events');
    expect(
      columnShape(accessEvent.findColumnWithPropertyName('residentId')!),
    ).toMatchObject({
      name: 'resident_id',
      type: 'uuid',
      nullable: true,
    });
    expect(
      columnShape(accessEvent.findColumnWithPropertyName('unitId')!),
    ).toMatchObject({
      name: 'unit_id',
      type: 'uuid',
      nullable: true,
    });
    expect(
      columnShape(accessEvent.findColumnWithPropertyName('createdAt')!),
    ).toMatchObject({
      name: 'created_at',
      type: 'timestamptz',
      nullable: false,
    });
  });
});
