import { MigrationInterface, QueryRunner } from 'typeorm';

export class valuesJsonToText1573941777062 implements MigrationInterface {
  name = 'valuesJsonToText1573941777062';

  public async up(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(`DROP INDEX "IDX_8a80a3cf6b2d815920a390968a"`, undefined);
    await queryRunner.query(`CREATE TABLE "temporary_event_list" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "event" varchar NOT NULL, "username" varchar NOT NULL, "timestamp" bigint NOT NULL, "values_json" varchar NOT NULL)`, undefined);
    await queryRunner.query(`INSERT INTO "temporary_event_list"("id", "event", "username", "timestamp", "values_json") SELECT "id", "event", "username", "timestamp", "values_json" FROM "event_list"`, undefined);
    await queryRunner.query(`DROP TABLE "event_list"`, undefined);
    await queryRunner.query(`ALTER TABLE "temporary_event_list" RENAME TO "event_list"`, undefined);
    await queryRunner.query(`CREATE INDEX "IDX_8a80a3cf6b2d815920a390968a" ON "event_list" ("username") `, undefined);
    await queryRunner.query(`DROP INDEX "IDX_8a80a3cf6b2d815920a390968a"`, undefined);
    await queryRunner.query(`CREATE TABLE "temporary_event_list" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "event" varchar NOT NULL, "username" varchar NOT NULL, "timestamp" bigint NOT NULL, "values_json" text NOT NULL)`, undefined);
    await queryRunner.query(`INSERT INTO "temporary_event_list"("id", "event", "username", "timestamp", "values_json") SELECT "id", "event", "username", "timestamp", "values_json" FROM "event_list"`, undefined);
    await queryRunner.query(`DROP TABLE "event_list"`, undefined);
    await queryRunner.query(`ALTER TABLE "temporary_event_list" RENAME TO "event_list"`, undefined);
    await queryRunner.query(`CREATE INDEX "IDX_8a80a3cf6b2d815920a390968a" ON "event_list" ("username") `, undefined);
  }

  public async down(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(`DROP INDEX "IDX_8a80a3cf6b2d815920a390968a"`, undefined);
    await queryRunner.query(`ALTER TABLE "event_list" RENAME TO "temporary_event_list"`, undefined);
    await queryRunner.query(`CREATE TABLE "event_list" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "event" varchar NOT NULL, "username" varchar NOT NULL, "timestamp" bigint NOT NULL, "values_json" varchar NOT NULL)`, undefined);
    await queryRunner.query(`INSERT INTO "event_list"("id", "event", "username", "timestamp", "values_json") SELECT "id", "event", "username", "timestamp", "values_json" FROM "temporary_event_list"`, undefined);
    await queryRunner.query(`DROP TABLE "temporary_event_list"`, undefined);
    await queryRunner.query(`CREATE INDEX "IDX_8a80a3cf6b2d815920a390968a" ON "event_list" ("username") `, undefined);
    await queryRunner.query(`DROP INDEX "IDX_8a80a3cf6b2d815920a390968a"`, undefined);
    await queryRunner.query(`ALTER TABLE "event_list" RENAME TO "temporary_event_list"`, undefined);
    await queryRunner.query(`CREATE TABLE "event_list" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "event" varchar NOT NULL, "username" varchar NOT NULL, "timestamp" bigint NOT NULL, "values_json" varchar NOT NULL)`, undefined);
    await queryRunner.query(`INSERT INTO "event_list"("id", "event", "username", "timestamp", "values_json") SELECT "id", "event", "username", "timestamp", "values_json" FROM "temporary_event_list"`, undefined);
    await queryRunner.query(`DROP TABLE "temporary_event_list"`, undefined);
    await queryRunner.query(`CREATE INDEX "IDX_8a80a3cf6b2d815920a390968a" ON "event_list" ("username") `, undefined);
  }

}
