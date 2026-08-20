import { describe, expect, it } from 'vitest';
import { createTypeOrmOptions } from './database.config';

describe('createTypeOrmOptions', () => {
  it('never synchronizes or runs migrations on startup', () => {
    const options = createTypeOrmOptions(
      'postgresql://user:pass@localhost:5432/db',
    );

    expect(options.synchronize).toBe(false);
    expect(options.migrationsRun).toBe(false);
    expect(options.type).toBe('postgres');
  });
});
