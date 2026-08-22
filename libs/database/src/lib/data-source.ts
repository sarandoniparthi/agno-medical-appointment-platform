import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { PlatformSettings0000000000001 } from '../migrations/0000000000001-platform-settings';
import { AppointmentDomain0000000000002 } from '../migrations/0000000000002-appointment-domain';
import { SeedSchedulingDemo0000000000003 } from '../migrations/0000000000003-seed-scheduling-demo';
import { requireDatabaseUrl } from './database.config';

const databaseUrl = requireDatabaseUrl();

export const databaseMigrations = [
  PlatformSettings0000000000001,
  AppointmentDomain0000000000002,
  SeedSchedulingDemo0000000000003,
];

export default new DataSource({
  type: 'postgres',
  url: databaseUrl,
  migrations: databaseMigrations,
  synchronize: false,
  migrationsRun: false,
  logging: false,
});
