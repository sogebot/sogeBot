import { MigrationInterface, QueryRunner } from 'typeorm';

export class addPluginsSetrtings1663675337188 implements MigrationInterface {
  name = 'addPluginsSetrtings1663675337188';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "temporary_plugin" ("id" varchar PRIMARY KEY NOT NULL, "name" varchar NOT NULL, "workflow" text NOT NULL, "enabled" boolean NOT NULL, "settings" text)`);
    await queryRunner.query(`INSERT INTO "temporary_plugin"("id", "name", "workflow", "enabled") SELECT "id", "name", "workflow", "enabled" FROM "plugin"`);
    await queryRunner.query(`DROP TABLE "plugin"`);
    await queryRunner.query(`ALTER TABLE "temporary_plugin" RENAME TO "plugin"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    return;
  }

}
