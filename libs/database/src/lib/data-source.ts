import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { PlatformSettings0000000000001 } from '../migrations/0000000000001-platform-settings';

const databaseUrl =
  process.env.DATABASE_URL ??
  'postgresql://scheduler:scheduler-local-only@localhost:5432/scheduler';

export const databaseMigrations = [PlatformSettings0000000000001];

export default new DataSource({
  type: 'postgres',
  url: databaseUrl,
  migrations: databaseMigrations,
  synchronize: false,
  migrationsRun: false,
  logging: false,
});
