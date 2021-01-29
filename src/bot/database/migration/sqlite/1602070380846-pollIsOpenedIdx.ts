import { MigrationInterface, QueryRunner } from 'typeorm';

export class pollIsOpenedIdx1602070380846 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "temporary_poll" ("id" varchar PRIMARY KEY NOT NULL, "type" varchar(7) NOT NULL, "title" varchar NOT NULL, "isOpened" boolean NOT NULL, "openedAt" bigint NOT NULL DEFAULT (0), "closedAt" bigint NOT NULL DEFAULT (0), "options" text NOT NULL)`);
    await queryRunner.query(`INSERT INTO "temporary_poll"("id", "type", "title", "isOpened", "openedAt", "closedAt", "options") SELECT "id", "type", "title", "isOpened", "openedAt", "closedAt", "options" FROM "poll"`);
    await queryRunner.query(`DROP TABLE "poll"`);
    await queryRunner.query(`ALTER TABLE "temporary_poll" RENAME TO "poll"`);
    await queryRunner.query(`CREATE INDEX "IDX_poll_isOpened" ON "poll" ("isOpened") `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_poll_isOpened"`);
    await queryRunner.query(`ALTER TABLE "poll" RENAME TO "temporary_poll"`);
    await queryRunner.query(`CREATE TABLE "poll" ("id" varchar PRIMARY KEY NOT NULL, "type" varchar(6) NOT NULL, "title" varchar NOT NULL, "isOpened" boolean NOT NULL, "openedAt" bigint NOT NULL DEFAULT (0), "closedAt" bigint NOT NULL DEFAULT (0), "options" text NOT NULL)`);
    await queryRunner.query(`INSERT INTO "poll"("id", "type", "title", "isOpened", "openedAt", "closedAt", "options") SELECT "id", "type", "title", "isOpened", "openedAt", "closedAt", "options" FROM "temporary_poll"`);
    await queryRunner.query(`DROP TABLE "temporary_poll"`);
  }

}
