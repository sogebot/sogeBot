import { MigrationInterface, QueryRunner } from 'typeorm';

export class quotesIdToInt1588962416420 implements MigrationInterface {
  name = 'quotesIdToInt1588962416420';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "temporary_quotes" ("id" varchar PRIMARY KEY NOT NULL, "tags" text NOT NULL, "quote" varchar NOT NULL, "quotedBy" integer NOT NULL, "createdAt" bigint NOT NULL)`, undefined);
    await queryRunner.query(`INSERT INTO "temporary_quotes"("id", "tags", "quote", "quotedBy", "createdAt") SELECT "id", "tags", "quote", "quotedBy", "createdAt" FROM "quotes"`, undefined);
    await queryRunner.query(`DROP TABLE "quotes"`, undefined);
    await queryRunner.query(`ALTER TABLE "temporary_quotes" RENAME TO "quotes"`, undefined);
    await queryRunner.query(`CREATE TABLE "temporary_quotes" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "tags" text NOT NULL, "quote" varchar NOT NULL, "quotedBy" integer NOT NULL, "createdAt" bigint NOT NULL)`, undefined);
    await queryRunner.query(`INSERT INTO "temporary_quotes"("tags", "quote", "quotedBy", "createdAt") SELECT "tags", "quote", "quotedBy", "createdAt" FROM "quotes"`, undefined);
    await queryRunner.query(`DROP TABLE "quotes"`, undefined);
    await queryRunner.query(`ALTER TABLE "temporary_quotes" RENAME TO "quotes"`, undefined);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "quotes" RENAME TO "temporary_quotes"`, undefined);
    await queryRunner.query(`CREATE TABLE "quotes" ("id" varchar PRIMARY KEY NOT NULL, "tags" text NOT NULL, "quote" varchar NOT NULL, "quotedBy" integer NOT NULL, "createdAt" bigint NOT NULL)`, undefined);
    await queryRunner.query(`INSERT INTO "quotes"("id", "tags", "quote", "quotedBy", "createdAt") SELECT "id", "tags", "quote", "quotedBy", "createdAt" FROM "temporary_quotes"`, undefined);
    await queryRunner.query(`DROP TABLE "temporary_quotes"`, undefined);
    await queryRunner.query(`ALTER TABLE "quotes" RENAME TO "temporary_quotes"`, undefined);
    await queryRunner.query(`CREATE TABLE "quotes" ("id" varchar PRIMARY KEY NOT NULL, "tags" text NOT NULL, "quote" varchar NOT NULL, "quotedBy" integer NOT NULL, "createdAt" bigint NOT NULL)`, undefined);
    await queryRunner.query(`INSERT INTO "quotes"("tags", "quote", "quotedBy", "createdAt") SELECT "tags", "quote", "quotedBy", "createdAt" FROM "temporary_quotes"`, undefined);
    await queryRunner.query(`DROP TABLE "temporary_quotes"`, undefined);
  }

}
