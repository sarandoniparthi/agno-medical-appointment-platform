import { describe, expect, it } from 'vitest';
import dataSource, { databaseMigrations } from './data-source';

describe('migration data source', () => {
  it('loads explicit migrations without startup schema changes', () => {
    expect(databaseMigrations).toHaveLength(1);
    expect(dataSource.options.migrations).toEqual(databaseMigrations);
    expect(dataSource.options.synchronize).toBe(false);
    expect(dataSource.options.migrationsRun).toBe(false);
  });
});
