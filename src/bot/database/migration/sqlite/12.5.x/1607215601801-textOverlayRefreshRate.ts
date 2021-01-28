import { MigrationInterface, QueryRunner } from 'typeorm';

export class textOverlayRefreshRate1607215601801 implements MigrationInterface {
  name = 'textOverlayRefreshRate1607215601801';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "temporary_text" ("id" varchar PRIMARY KEY NOT NULL, "name" varchar NOT NULL, "text" text NOT NULL, "css" text NOT NULL, "js" text NOT NULL, "external" text NOT NULL, "refreshRate" integer NOT NULL DEFAULT (5))`);
    await queryRunner.query(`INSERT INTO "temporary_text"("id", "name", "text", "css", "js", "external") SELECT "id", "name", "text", "css", "js", "external" FROM "text"`);
    await queryRunner.query(`DROP TABLE "text"`);
    await queryRunner.query(`ALTER TABLE "temporary_text" RENAME TO "text"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "text" RENAME TO "temporary_text"`);
    await queryRunner.query(`CREATE TABLE "text" ("id" varchar PRIMARY KEY NOT NULL, "name" varchar NOT NULL, "text" text NOT NULL, "css" text NOT NULL, "js" text NOT NULL, "external" text NOT NULL)`);
    await queryRunner.query(`INSERT INTO "text"("id", "name", "text", "css", "js", "external") SELECT "id", "name", "text", "css", "js", "external" FROM "temporary_text"`);
    await queryRunner.query(`DROP TABLE "temporary_text"`);
  }

}
