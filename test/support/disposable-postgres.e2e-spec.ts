/* eslint-disable prettier/prettier, @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unnecessary-type-assertion */

jest.mock('node:child_process', () => {
  const execFile = jest.fn();
  execFile[Symbol.for('nodejs.util.promisify.custom')] = (...args: unknown[]) =>
    new Promise((resolve, reject) => execFile(...args, (error: Error | null, stdout: string, stderr: string) =>
      error ? reject(error) : resolve({ stdout, stderr }),
    ));
  return { execFile };
});

const childProcess = require('node:child_process') as { execFile: jest.Mock };
const { startDisposablePostgres } = require('./disposable-postgres') as typeof import('./disposable-postgres');
type Call = { file: string; args: string[]; options: { env: NodeJS.ProcessEnv; shell: boolean; timeout: number } };

describe('startDisposablePostgres', () => {
  const calls: Call[] = [];
  const record = (file: string, args: string[], options: Call['options']) => calls.push({ file, args, options });

  beforeEach(() => {
    calls.length = 0;
    childProcess.execFile.mockImplementation((file, args, options, callback) => {
      record(file as string, args as string[], options as Call['options']);
      return callback(null, args[0] === 'port' ? '127.0.0.1:54321\n' : '', '');
    });
  });
  afterEach(() => jest.restoreAllMocks());

  it('rejects invalid prefixes and returns unique safe identifiers', async () => {
    await expect(startDisposablePostgres('Bad_prefix')).rejects.toThrow('Invalid PostgreSQL prefix');
    expect(calls).toHaveLength(0);
    const [first, second] = await Promise.all([startDisposablePostgres('resident-proof'), startDisposablePostgres('resident-proof')]);
    for (const database of [first, second]) {
      expect(database.options).toMatchObject({ type: 'postgres', host: '127.0.0.1', port: 54321 });
      expect(database.options.database).toMatch(/^sigra_db_\d+_[a-f0-9]{32}$/u);
      expect(database.options.username).toMatch(/^sigra_user_\d+_[a-f0-9]{32}$/u);
      expect(database.options.database.length).toBeLessThan(64);
      expect(database.options.username.length).toBeLessThan(64);
    }
    expect(first.options.database).not.toBe(second.options.database);
    expect(first.options.username).not.toBe(second.options.username);
    const containers = calls.filter(({ args }) => args[0] === 'run').map(({ args }) => args[3]);
    expect(containers).toEqual([expect.stringMatching(/^resident-proof-\d+-[a-f0-9-]{36}$/u), expect.any(String)]);
    expect(new Set(containers).size).toBe(2);
    await Promise.all([first.stop(), second.stop()]);
  });

  it('uses docker, exact secure argv, options, and secret environments for every operation', async () => {
    const database = await startDisposablePostgres('proof');
    const [run, ready, port] = calls;
    expect(run.args).toEqual(['run', '--detach', '--name', run.args[3], '--publish', '127.0.0.1::5432', '--env', 'POSTGRES_DB', '--env', 'POSTGRES_USER', '--env', 'POSTGRES_PASSWORD', 'postgres:16-alpine']);
    expect(ready.args).toEqual(['exec', '--env', 'PGPASSWORD', run.args[3], 'psql', '--host', '127.0.0.1', '--username', database.options.username, '--dbname', database.options.database, '--command', 'SELECT 1']);
    expect(port.args).toEqual(['port', run.args[3], '5432/tcp']);
    expect(run.options.env.POSTGRES_PASSWORD).toBe(database.options.password);
    expect(ready.options.env.PGPASSWORD).toBe(database.options.password);
    await database.stop();
    expect(calls[3].args).toEqual(['rm', '--force', run.args[3]]);
    expect(calls.map(({ file }) => file)).toEqual(['docker', 'docker', 'docker', 'docker']);
    expect(calls.map(({ options }) => [options.shell, options.timeout])).toEqual([[false, 20_000], [false, 1_000], [false, 5_000], [false, 5_000]]);
    expect(calls.every(({ args }) => !args.includes(database.options.password))).toBe(true);
  });

  it('retains both errors, includes Docker operation context, and spaces all readiness retries', async () => {
    const delays: number[] = [];
    jest.spyOn(global, 'setTimeout').mockImplementation(((callback: () => void, milliseconds: number) => {
      delays.push(milliseconds); callback(); return 0 as unknown as NodeJS.Timeout;
    }) as typeof setTimeout);
    childProcess.execFile.mockImplementation((file, args, options, callback) => {
      record(file as string, args as string[], options as Call['options']);
      if (args[0] === 'exec') return callback(new Error('not ready'));
      if (args[0] === 'rm') return callback(new Error('remove failed'));
      return callback(null, '', '');
    });
    const error = await startDisposablePostgres('proof').catch((caught) => caught);
    expect(error).toBeInstanceOf(AggregateError);
    expect((error as AggregateError).errors).toEqual([expect.objectContaining({ message: 'Docker exec operation failed' }), expect.objectContaining({ message: 'Docker rm operation failed' })]);
    expect(calls.filter(({ args }) => args[0] === 'exec')).toHaveLength(60);
    expect(delays).toEqual(Array(59).fill(250));
  });

  it('memoizes concurrent stop removal', async () => {
    const database = await startDisposablePostgres('proof');
    await Promise.all([database.stop(), database.stop(), database.stop()]);
    expect(calls.filter(({ args }) => args[0] === 'rm')).toHaveLength(1);
  });
});
