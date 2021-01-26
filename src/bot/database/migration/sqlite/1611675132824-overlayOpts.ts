import {MigrationInterface, QueryRunner} from 'typeorm';

export class overlayOpts1611675132824 implements MigrationInterface {
  name = 'overlayOpts1611675132824';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "temporary_overlay_mapper" ("id" varchar PRIMARY KEY NOT NULL, "value" varchar, "opts" text)`);
    await queryRunner.query(`INSERT INTO "temporary_overlay_mapper"("id", "value") SELECT "id", "value" FROM "overlay_mapper"`);
    await queryRunner.query(`DROP TABLE "overlay_mapper"`);
    await queryRunner.query(`ALTER TABLE "temporary_overlay_mapper" RENAME TO "overlay_mapper"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "overlay_mapper" RENAME TO "temporary_overlay_mapper"`);
    await queryRunner.query(`CREATE TABLE "overlay_mapper" ("id" varchar PRIMARY KEY NOT NULL, "value" varchar)`);
    await queryRunner.query(`INSERT INTO "overlay_mapper"("id", "value") SELECT "id", "value" FROM "temporary_overlay_mapper"`);
    await queryRunner.query(`DROP TABLE "temporary_overlay_mapper"`);
  }

}
