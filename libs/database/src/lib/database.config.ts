import type { TypeOrmModuleOptions } from '@nestjs/typeorm';

export function createTypeOrmOptions(
  databaseUrl: string,
): TypeOrmModuleOptions {
  return {
    type: 'postgres',
    url: databaseUrl,
    autoLoadEntities: true,
    synchronize: false,
    migrationsRun: false,
    logging: false,
  };
}
