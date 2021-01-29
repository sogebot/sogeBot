import { MigrationInterface, QueryRunner } from 'typeorm';

export class obswebsocket1611675132824 implements MigrationInterface {
  name = 'obswebsocket1611675132824';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "obswebsocket" ("id" character varying(14)  NOT NULL, "name" character varying NOT NULL, "advancedMode" boolean NOT NULL DEFAULT false, "advancedModeCode" text NOT NULL, "simpleModeTasks" text NOT NULL, CONSTRAINT "PK_e02d10a34d5a7da25a92d4572de" PRIMARY KEY ("id"))`);
    await queryRunner.query(`ALTER TABLE "overlay_mapper" ADD "opts" text`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "overlay_mapper" DROP COLUMN "opts"`);
    await queryRunner.query(`DROP TABLE "obswebsocket"`);
  }

}
