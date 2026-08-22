import { afterEach, describe, expect, it, vi } from 'vitest';

describe('migration data source', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('fails closed when DATABASE_URL is not configured', async () => {
    vi.stubEnv('DATABASE_URL', '');

    await expect(import('./data-source')).rejects.toThrow(
      'DATABASE_URL is required',
    );
  });

  it('loads explicit migrations without startup schema changes', async () => {
    vi.stubEnv(
      'DATABASE_URL',
      'postgresql://user:pass@localhost:5432/scheduler_test',
    );
    const { default: dataSource, databaseMigrations } = await import(
      './data-source'
    );

    expect(databaseMigrations).toHaveLength(3);
    expect(dataSource.options.migrations).toEqual(databaseMigrations);
    expect(dataSource.options.synchronize).toBe(false);
    expect(dataSource.options.migrationsRun).toBe(false);
  });
});
