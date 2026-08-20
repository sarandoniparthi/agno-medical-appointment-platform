import type { MigrationInterface, QueryRunner } from 'typeorm';

export class PlatformSettings0000000000001 implements MigrationInterface {
  name = 'PlatformSettings0000000000001';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "platform_settings" (
        "key" text PRIMARY KEY,
        "value" jsonb NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "platform_settings"');
  }
}
