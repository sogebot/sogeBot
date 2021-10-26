import { MigrationInterface, QueryRunner } from 'typeorm';

export class addAliasGroup1635195800169 implements MigrationInterface {
  name = 'addAliasGroup1635195800169';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "alias_group" ("name" character varying NOT NULL, "options" text NOT NULL, CONSTRAINT "PK_2d40a2a41c8eb8d436b6ce1387c" PRIMARY KEY ("name"))`);
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_alias_group_unique_name" ON "alias_group" ("name") `);
    await queryRunner.query(`ALTER TABLE "alias" ALTER COLUMN "permission" DROP NOT NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "alias" ALTER COLUMN "permission" SET NOT NULL`);
    await queryRunner.query(`DROP INDEX "public"."IDX_alias_group_unique_name"`);
    await queryRunner.query(`DROP TABLE "alias_group"`);
  }
}