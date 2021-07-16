import { MigrationInterface, QueryRunner } from 'typeorm';

export class eventListIsHiddenAttr1601297968526 implements MigrationInterface {
  name = 'eventListIsHiddenAttr1601297968526';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_8a80a3cf6b2d815920a390968a"`);
    await queryRunner.query(`CREATE TABLE "temporary_event_list" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "event" varchar NOT NULL, "userId" varchar NOT NULL, "timestamp" bigint NOT NULL, "values_json" text NOT NULL, "isTest" boolean NOT NULL, "isHidden" boolean NOT NULL DEFAULT (0))`);
    await queryRunner.query(`INSERT INTO "temporary_event_list"("id", "event", "userId", "timestamp", "values_json", "isTest") SELECT "id", "event", "userId", "timestamp", "values_json", "isTest" FROM "event_list"`);
    await queryRunner.query(`DROP TABLE "event_list"`);
    await queryRunner.query(`ALTER TABLE "temporary_event_list" RENAME TO "event_list"`);
    await queryRunner.query(`CREATE INDEX "IDX_8a80a3cf6b2d815920a390968a" ON "event_list" ("userId") `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_8a80a3cf6b2d815920a390968a"`);
    await queryRunner.query(`ALTER TABLE "event_list" RENAME TO "temporary_event_list"`);
    await queryRunner.query(`CREATE TABLE "event_list" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "event" varchar NOT NULL, "userId" varchar NOT NULL, "timestamp" bigint NOT NULL, "values_json" text NOT NULL, "isTest" boolean NOT NULL)`);
    await queryRunner.query(`INSERT INTO "event_list"("id", "event", "userId", "timestamp", "values_json", "isTest") SELECT "id", "event", "userId", "timestamp", "values_json", "isTest" FROM "temporary_event_list"`);
    await queryRunner.query(`DROP TABLE "temporary_event_list"`);
    await queryRunner.query(`CREATE INDEX "IDX_8a80a3cf6b2d815920a390968a" ON "event_list" ("userId") `);
  }

}
