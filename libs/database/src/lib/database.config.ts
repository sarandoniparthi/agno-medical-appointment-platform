import type { TypeOrmModuleOptions } from '@nestjs/typeorm';

export function createTypeOrmOptions(
  databaseUrl: string | undefined,
): TypeOrmModuleOptions {
  const requiredDatabaseUrl = requireDatabaseUrl(databaseUrl);

  return {
    type: 'postgres',
    url: requiredDatabaseUrl,
    autoLoadEntities: true,
    synchronize: false,
    migrationsRun: false,
    logging: false,
  };
}

export function requireDatabaseUrl(
  databaseUrl = process.env.DATABASE_URL,
): string {
  const normalizedDatabaseUrl = databaseUrl?.trim();
  if (!normalizedDatabaseUrl) {
    throw new Error('DATABASE_URL is required');
  }

  return normalizedDatabaseUrl;
}
