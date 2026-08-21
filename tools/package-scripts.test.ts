import { spawnSync } from 'node:child_process';
import {
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

interface PackageManifest {
  scripts: Record<string, string | undefined>;
}

const workspaceRoot = resolve(import.meta.dirname, '..');
const packageManifest = JSON.parse(
  readFileSync(join(workspaceRoot, 'package.json'), 'utf8'),
) as PackageManifest;

describe('package scripts', () => {
  it.each(['db:migrate', 'db:revert'])(
    '%s loads DATABASE_URL from the root env file before running TypeScript',
    (scriptName) => {
      const script = requiredScript(scriptName);
      const cliMarker = './node_modules/typeorm/cli.js';
      const markerIndex = script.indexOf(cliMarker);
      expect(markerIndex).toBeGreaterThan(0);
      const launcher = script.slice(0, markerIndex).trim().split(/\s+/);

      const fixtureDirectory = mkdtempSync(
        join(tmpdir(), 'database-script-env-'),
      );
      try {
        const envFile = join(fixtureDirectory, '.env');
        const probe = join(fixtureDirectory, 'probe.ts');
        writeFileSync(
          envFile,
          'DATABASE_URL=postgresql://fixture:fixture@localhost:55432/fixture\n',
        );
        writeFileSync(
          probe,
          [
            'const databaseUrl: string | undefined = process.env.DATABASE_URL;',
            "if (databaseUrl !== 'postgresql://fixture:fixture@localhost:55432/fixture') {",
            "  throw new Error('DATABASE_URL was not loaded from the env file');",
            '}',
          ].join('\n'),
        );

        const result = runLauncher(launcher, envFile, probe);

        expect(result.status).toBe(0);
      } finally {
        rmSync(fixtureDirectory, { force: true, recursive: true });
      }
    },
  );

  it('renders clean-checkout Compose config with the example environment', () => {
    const command = requiredScript('verify:compose').split(/\s+/);
    const executable = command.shift();
    const childEnvironment = { ...process.env };
    delete childEnvironment.POSTGRES_PASSWORD;
    delete childEnvironment.POSTGRES_HOST_PORT;
    expect(executable).toBeDefined();
    if (executable === undefined) {
      return;
    }

    const result = spawnSync(executable, command, {
      cwd: workspaceRoot,
      encoding: 'utf8',
      env: childEnvironment,
    });

    expect(result.status).toBe(0);
  });
});

function requiredScript(scriptName: string): string {
  const script = packageManifest.scripts[scriptName];
  expect(script, `missing package script: ${scriptName}`).toBeTypeOf('string');
  return script ?? '';
}

function runLauncher(
  launcher: string[],
  envFile: string,
  probe: string,
): ReturnType<typeof spawnSync> {
  const [executable, ...launcherArguments] = launcher;
  const childEnvironment = { ...process.env };
  delete childEnvironment.DATABASE_URL;

  if (executable === 'node') {
    const argumentsWithFixture = launcherArguments.map((argument) =>
      argument === '--env-file=.env' ? `--env-file=${envFile}` : argument,
    );
    return spawnSync(
      process.execPath,
      [...argumentsWithFixture, probe],
      { encoding: 'utf8', env: childEnvironment },
    );
  }

  if (executable === 'tsx') {
    return spawnSync(
      process.execPath,
      [resolve('node_modules/tsx/dist/cli.mjs'), ...launcherArguments, probe],
      { encoding: 'utf8', env: childEnvironment },
    );
  }

  throw new Error(`Unsupported database script launcher: ${executable}`);
}
