import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

async function check() {
  const directory = await mkdtemp(join(tmpdir(), 'sigra-openapi-'));
  const candidatePath = join(directory, 'v1.json');
  const trackedPath = resolve(process.cwd(), 'docs', 'openapi', 'v1.json');

  try {
    execFileSync(
      process.execPath,
      [resolve(__dirname, 'generate-openapi.js')],
      {
        env: { ...process.env, OPENAPI_OUTPUT_PATH: candidatePath },
        stdio: 'inherit',
      },
    );
    const [candidate, tracked] = await Promise.all([
      readFile(candidatePath, 'utf8'),
      readFile(trackedPath, 'utf8'),
    ]);
    if (candidate !== tracked) {
      throw new Error(
        'docs/openapi/v1.json is stale. Run npm run openapi:generate.',
      );
    }
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

void check().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
