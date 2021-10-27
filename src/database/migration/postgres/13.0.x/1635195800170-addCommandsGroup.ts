import { MigrationInterface, QueryRunner } from 'typeorm';

export class addCommandsGroup1635195800170 implements MigrationInterface {
  name = 'addCommandsGroup1635195800170';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "commands_group" ("name" character varying NOT NULL, "options" text NOT NULL, CONSTRAINT "PK_34de021816f3e460bf084d25aba" PRIMARY KEY ("name"))`);
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_commands_group_unique_name" ON "commands_group" ("name") `);
    await queryRunner.query(`ALTER TABLE "commands" ADD "group" character varying`);
    await queryRunner.query(`ALTER TABLE "commands_responses" ALTER COLUMN "permission" DROP NOT NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "commands_responses" ALTER COLUMN "permission" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "commands" DROP COLUMN "group"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_commands_group_unique_name"`);
    await queryRunner.query(`DROP TABLE "commands_group"`);
  }
}