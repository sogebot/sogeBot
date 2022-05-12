import { MigrationInterface, QueryRunner } from 'typeorm';

export class addPluginTable1650978850216 implements MigrationInterface {
  name = 'addPluginTable1650978850216';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "plugin" ("id" character varying NOT NULL, "name" character varying NOT NULL, "enabled" boolean NOT NULL, "workflow" text NOT NULL, CONSTRAINT "PK_9a65387180b2e67287345684c03" PRIMARY KEY ("id"))`);
    await queryRunner.query(`CREATE TABLE "plugin_variable" ("variableName" character varying NOT NULL, "pluginId" character varying NOT NULL, "value" text NOT NULL, CONSTRAINT "PK_8c7cf84aebae071dcbdb47381d6" PRIMARY KEY ("variableName", "pluginId"))`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "plugin_variable"`);
    await queryRunner.query(`DROP TABLE "plugin"`);
  }

}
