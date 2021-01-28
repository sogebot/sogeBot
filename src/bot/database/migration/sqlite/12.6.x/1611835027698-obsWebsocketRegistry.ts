import {MigrationInterface, QueryRunner} from 'typeorm';

export class obsWebsocketRegistry1611835027698 implements MigrationInterface {
  name = 'obsWebsocketRegistry1611835027698';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "obswebsocket" ("id" integer PRIMARY KEY NOT NULL, "name" varchar NOT NULL, "advancedMode" boolean NOT NULL DEFAULT (0), "advancedModeCode" text NOT NULL, "simpleModeTasks" text NOT NULL)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "obswebsocket"`);
  }

}
