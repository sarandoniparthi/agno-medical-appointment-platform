import { describe, expect, it } from 'vitest';

describe('migration data source', () => {
  it('loads explicit migrations without startup schema changes', async () => {
    const { databaseMigrations, default: dataSource } = await import(
      './data-source'
    );

    expect(databaseMigrations).toHaveLength(1);
    expect(dataSource.options.migrations).toEqual(databaseMigrations);
    expect(dataSource.options.synchronize).toBe(false);
    expect(dataSource.options.migrationsRun).toBe(false);
  });
});
