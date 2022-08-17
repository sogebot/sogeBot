import { MigrationInterface, QueryRunner } from 'typeorm';

export class updateCommands1659639416174 implements MigrationInterface {
  name = 'updateCommands1659639416174';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "commands_board"`);
    await queryRunner.query(`DROP TABLE "commands_count"`);
    await queryRunner.query(`CREATE TABLE "commands_count" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "command" character varying NOT NULL, "timestamp" character varying(30) NOT NULL, CONSTRAINT "PK_80e221b846abb1a84ab81281a7a" PRIMARY KEY ("id"))`);
    await queryRunner.query(`CREATE INDEX "IDX_2ccf816b1dd74e9a02845c4818" ON "commands_count" ("command") `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    return;
  }

}