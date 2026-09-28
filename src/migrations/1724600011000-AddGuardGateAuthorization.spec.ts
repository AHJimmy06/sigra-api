import { AddGuardGateAuthorization1724600011000 } from './1724600011000-AddGuardGateAuthorization';

describe('AddGuardGateAuthorization migration', () => {
  it('adds an independent default-denied authorization for existing and new users', async () => {
    const queries: string[] = [];
    await new AddGuardGateAuthorization1724600011000().up({
      query: (sql: string) => {
        queries.push(sql);
      },
    } as never);

    expect(queries).toEqual([
      'ALTER TABLE "users" ADD COLUMN "guard_gate_authorized" boolean NOT NULL DEFAULT false',
    ]);
  });

  it('removes the authorization column on rollback', async () => {
    const queries: string[] = [];
    await new AddGuardGateAuthorization1724600011000().down({
      query: (sql: string) => {
        queries.push(sql);
      },
    } as never);

    expect(queries).toEqual([
      'ALTER TABLE "users" DROP COLUMN "guard_gate_authorized"',
    ]);
  });
});
