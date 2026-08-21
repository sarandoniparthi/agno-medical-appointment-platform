import { describe, expect, it } from 'vitest';
import { createTypeOrmOptions } from './database.config';

describe('createTypeOrmOptions', () => {
  it.each([undefined, '', '   '])(
    'rejects a missing or blank DATABASE_URL value (%s)',
    (databaseUrl) => {
      expect(() => createTypeOrmOptions(databaseUrl)).toThrow(
        'DATABASE_URL is required',
      );
    },
  );

  it('never synchronizes or runs migrations on startup', () => {
    const options = createTypeOrmOptions(
      'postgresql://user:pass@localhost:5432/db',
    );

    expect(options.synchronize).toBe(false);
    expect(options.migrationsRun).toBe(false);
    expect(options.type).toBe('postgres');
  });
});
