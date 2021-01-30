import { MigrationInterface, QueryRunner } from 'typeorm';

export class highlight1616869485136 implements MigrationInterface {
  name = 'highlight1616869485136';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "temporary_highlight" ("id" varchar PRIMARY KEY NOT NULL, "videoId" varchar NOT NULL, "game" varchar NOT NULL, "title" varchar NOT NULL, "timestamp" text NOT NULL, "createdAt" bigint NOT NULL, "expired" boolean NOT NULL DEFAULT (0))`);
    await queryRunner.query(`INSERT INTO "temporary_highlight"("id", "videoId", "game", "title", "timestamp", "createdAt") SELECT "id", "videoId", "game", "title", "timestamp", "createdAt" FROM "highlight"`);
    await queryRunner.query(`DROP TABLE "highlight"`);
    await queryRunner.query(`ALTER TABLE "temporary_highlight" RENAME TO "highlight"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "highlight" RENAME TO "temporary_highlight"`);
    await queryRunner.query(`CREATE TABLE "highlight" ("id" varchar PRIMARY KEY NOT NULL, "videoId" varchar NOT NULL, "game" varchar NOT NULL, "title" varchar NOT NULL, "timestamp" text NOT NULL, "createdAt" bigint NOT NULL)`);
    await queryRunner.query(`INSERT INTO "highlight"("id", "videoId", "game", "title", "timestamp", "createdAt") SELECT "id", "videoId", "game", "title", "timestamp", "createdAt" FROM "temporary_highlight"`);
    await queryRunner.query(`DROP TABLE "temporary_highlight"`);
  }

}
