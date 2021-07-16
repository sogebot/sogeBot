import { MigrationInterface, QueryRunner } from 'typeorm';

export class pointsChangelog1587985914346 implements MigrationInterface {
  name = 'pointsChangelog1587985914346';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "points_changelog" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "userId" integer NOT NULL, "originalValue" integer NOT NULL, "updatedValue" integer NOT NULL, "updatedAt" bigint NOT NULL, "command" varchar NOT NULL)`, undefined);
    await queryRunner.query(`CREATE INDEX "IDX_points_changelog_userId" ON "points_changelog" ("userId") `, undefined);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_points_changelog_userId"`, undefined);
    await queryRunner.query(`DROP TABLE "points_changelog"`, undefined);
  }

}
