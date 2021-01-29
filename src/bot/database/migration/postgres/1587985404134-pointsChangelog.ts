import { MigrationInterface, QueryRunner } from 'typeorm';

export class pointsChangelog1587985404134 implements MigrationInterface {
  name = 'pointsChangelog1587985404134';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "points_changelog" ("id" SERIAL NOT NULL, "userId" integer NOT NULL, "originalValue" integer NOT NULL, "updatedValue" integer NOT NULL, "updatedAt" bigint NOT NULL, "command" character varying NOT NULL, CONSTRAINT "PK_0c0431424ad9af4002e606a5337" PRIMARY KEY ("id"))`, undefined);
    await queryRunner.query(`CREATE INDEX "IDX_points_changelog_userId" ON "points_changelog" ("userId") `, undefined);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_points_changelog_userId"`, undefined);
    await queryRunner.query(`DROP TABLE "points_changelog"`, undefined);
  }

}
