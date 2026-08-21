import { EntitySchema } from 'typeorm';

export interface PlatformSettingEntity {
  key: string;
  value: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export const PlatformSettingEntity = new EntitySchema<PlatformSettingEntity>({
  name: 'platform_settings',
  columns: {
    key: {
      type: 'text',
      primary: true,
    },
    value: {
      type: 'jsonb',
    },
    createdAt: {
      name: 'created_at',
      type: 'timestamptz',
      createDate: true,
    },
    updatedAt: {
      name: 'updated_at',
      type: 'timestamptz',
      updateDate: true,
    },
  },
});
