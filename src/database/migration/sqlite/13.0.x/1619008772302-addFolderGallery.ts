import { MigrationInterface, QueryRunner } from 'typeorm';

export class addFolderGallery1619008772302 implements MigrationInterface {
  name = 'addFolderGallery1619008772302';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "temporary_gallery" ("id" varchar PRIMARY KEY NOT NULL, "type" varchar NOT NULL, "data" text NOT NULL, "name" varchar NOT NULL, "folder" varchar NOT NULL DEFAULT ('/'))`);
    await queryRunner.query(`INSERT INTO "temporary_gallery"("id", "type", "data", "name") SELECT "id", "type", "data", "name" FROM "gallery"`);
    await queryRunner.query(`DROP TABLE "gallery"`);
    await queryRunner.query(`ALTER TABLE "temporary_gallery" RENAME TO "gallery"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "gallery" RENAME TO "temporary_gallery"`);
    await queryRunner.query(`CREATE TABLE "gallery" ("id" varchar PRIMARY KEY NOT NULL, "type" varchar NOT NULL, "data" text NOT NULL, "name" varchar NOT NULL)`);
    await queryRunner.query(`INSERT INTO "gallery"("id", "type", "data", "name") SELECT "id", "type", "data", "name" FROM "temporary_gallery"`);
    await queryRunner.query(`DROP TABLE "temporary_gallery"`);
  }

}
