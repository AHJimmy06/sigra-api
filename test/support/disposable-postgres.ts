import { execFile as execFileCallback } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { promisify } from 'node:util';

/* eslint-disable prettier/prettier */

const execFile = promisify(execFileCallback);
const prefixPattern = /^[a-z0-9](?:[a-z0-9-]{0,22}[a-z0-9])?$/u;

type Options = {
  type: 'postgres'; host: '127.0.0.1'; port: number;
  username: string; password: string; database: string;
};

async function docker(args: string[], env: NodeJS.ProcessEnv, timeout: number) {
  try {
    return await execFile('docker', args, { env, shell: false, timeout });
  } catch (error) {
    throw new Error(`Docker ${args[0]} operation failed`, { cause: error });
  }
}

function delay(milliseconds: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, milliseconds));
}

export async function startDisposablePostgres(prefix: string): Promise<{
  options: Options; stop(): Promise<void>;
}> {
  if (!prefixPattern.test(prefix)) throw new Error('Invalid PostgreSQL prefix');

  const unique = randomUUID().replace(/-/gu, '');
  const container = `${prefix}-${process.pid}-${randomUUID()}`;
  const database = `sigra_db_${process.pid}_${unique}`;
  const username = `sigra_user_${process.pid}_${unique}`;
  const password = randomUUID();
  const environment = { ...process.env, POSTGRES_DB: database, POSTGRES_USER: username, POSTGRES_PASSWORD: password };
  let removal: Promise<void> | undefined;
  const stop = () => removal ??= docker(['rm', '--force', container], process.env, 5_000).then(() => undefined);

  try {
    await docker([
      'run', '--detach', '--name', container, '--publish', '127.0.0.1::5432',
      '--env', 'POSTGRES_DB', '--env', 'POSTGRES_USER', '--env', 'POSTGRES_PASSWORD',
      'postgres:16-alpine',
    ], environment, 20_000);
    let readinessError: unknown;
    for (let attempt = 0; attempt < 60; attempt += 1) {
      try {
        await docker([
          'exec', '--env', 'PGPASSWORD', container, 'psql', '--host', '127.0.0.1',
          '--username', username, '--dbname', database, '--command', 'SELECT 1',
        ], { ...process.env, PGPASSWORD: password }, 1_000);
        readinessError = undefined;
        break;
      } catch (error) {
        readinessError = error;
        if (attempt < 59) await delay(250);
      }
    }
    if (readinessError) {
      throw readinessError instanceof Error
        ? readinessError
        : new Error('PostgreSQL readiness failed');
    }
    const { stdout } = await docker(['port', container, '5432/tcp'], process.env, 5_000);
    const matched = stdout.match(/^127\.0\.0\.1:(\d+)\s*$/u);
    const port = Number(matched?.[1]);
    if (!matched || port < 1 || port > 65_535) {
      throw new Error('PostgreSQL did not publish a dynamic loopback port');
    }
    return { options: { type: 'postgres', host: '127.0.0.1', port, username, password, database }, stop };
  } catch (primary) {
    try {
      await stop();
    } catch (cleanup) {
      throw new AggregateError([primary, cleanup], 'PostgreSQL startup and cleanup failed');
    }
    throw primary;
  }
}
