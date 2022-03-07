import { MigrationInterface, QueryRunner } from 'typeorm';

export class updateOverlayMappers1645019207859 implements MigrationInterface {
  name = 'updateOverlayMappers1645019207859';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "temporary_overlay_mapper" ("id" varchar PRIMARY KEY NOT NULL, "value" varchar, "opts" text, "groupId" varchar, "name" varchar)`);
    await queryRunner.query(`INSERT INTO "temporary_overlay_mapper"("id", "value", "opts", "groupId") SELECT "id", "value", "opts", "groupId" FROM "overlay_mapper"`);
    await queryRunner.query(`DROP TABLE "overlay_mapper"`);
    await queryRunner.query(`ALTER TABLE "temporary_overlay_mapper" RENAME TO "overlay_mapper"`);
    await queryRunner.query(`CREATE INDEX "IDX_overlay_mapper_groupId" ON "overlay_mapper" ("groupId") `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    return;
  }

}
