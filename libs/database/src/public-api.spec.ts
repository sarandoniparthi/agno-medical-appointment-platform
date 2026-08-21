import { EntitySchema } from 'typeorm';
import { describe, expect, it } from 'vitest';
import {
  createTypeOrmOptions,
  PlatformSettingEntity,
} from '@scheduler/database';

describe('@scheduler/database', () => {
  it('exports the safe runtime options and platform setting entity', () => {
    const setting: PlatformSettingEntity = {
      key: 'clinic-time-zone',
      value: { zone: 'America/Chicago' },
      createdAt: new Date('2026-08-21T00:00:00.000Z'),
      updatedAt: new Date('2026-08-21T00:00:00.000Z'),
    };

    expect(
      createTypeOrmOptions('postgresql://user:pass@localhost:5432/db')
        .migrationsRun,
    ).toBe(false);
    expect(PlatformSettingEntity).toBeInstanceOf(EntitySchema);
    expect(setting.key).toBe('clinic-time-zone');
  });
});
