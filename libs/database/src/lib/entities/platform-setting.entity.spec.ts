import { EntitySchema } from 'typeorm';
import { describe, expect, it } from 'vitest';
import { PlatformSettingEntity } from './platform-setting.entity';

describe('PlatformSettingEntity', () => {
  it('loads directly as an EntitySchema without decorator transpilation', () => {
    expect(PlatformSettingEntity).toBeInstanceOf(EntitySchema);
  });
});
