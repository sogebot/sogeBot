import { MigrationInterface, QueryRunner } from 'typeorm';

export class obswebsocket1611675132824 implements MigrationInterface {
  name = 'obswebsocket1611675132824';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "temporary_overlay_mapper" ("id" varchar PRIMARY KEY NOT NULL, "value" varchar, "opts" text)`);
    await queryRunner.query(`INSERT INTO "temporary_overlay_mapper"("id", "value") SELECT "id", "value" FROM "overlay_mapper"`);
    await queryRunner.query(`DROP TABLE "overlay_mapper"`);
    await queryRunner.query(`ALTER TABLE "temporary_overlay_mapper" RENAME TO "overlay_mapper"`);
    await queryRunner.query(`CREATE TABLE "obswebsocket" ("id" varchar(14) PRIMARY KEY NOT NULL, "name" varchar NOT NULL, "advancedMode" boolean NOT NULL DEFAULT (0), "advancedModeCode" text NOT NULL, "simpleModeTasks" text NOT NULL)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "overlay_mapper" RENAME TO "temporary_overlay_mapper"`);
    await queryRunner.query(`CREATE TABLE "overlay_mapper" ("id" varchar PRIMARY KEY NOT NULL, "value" varchar)`);
    await queryRunner.query(`INSERT INTO "overlay_mapper"("id", "value") SELECT "id", "value" FROM "temporary_overlay_mapper"`);
    await queryRunner.query(`DROP TABLE "temporary_overlay_mapper"`);
    await queryRunner.query(`DROP TABLE "obswebsocket"`);
  }

}
