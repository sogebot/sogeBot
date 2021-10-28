import { MigrationInterface, QueryRunner } from 'typeorm';

export class addKeywordGroup1635453652529 implements MigrationInterface {
  name = 'addKeywordGroup1635453652529';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "keyword_group" ("name" character varying NOT NULL, "options" text NOT NULL, CONSTRAINT "PK_25e81b041cf1f67ea9ce294fd91" PRIMARY KEY ("name"))`);
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_keyword_group_unique_name" ON "keyword_group" ("name") `);
    await queryRunner.query(`ALTER TABLE "keyword" ADD "group" character varying`);
    await queryRunner.query(`ALTER TABLE "keyword_responses" ALTER COLUMN "permission" DROP NOT NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "keyword_responses" ALTER COLUMN "permission" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "keyword" DROP COLUMN "group"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_keyword_group_unique_name"`);
    await queryRunner.query(`DROP TABLE "keyword_group"`);
  }

}
