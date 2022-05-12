import { MigrationInterface, QueryRunner } from 'typeorm';

export class addPluginTable1650978850216 implements MigrationInterface {
  name = 'addPluginTable1650978850216';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "plugin" ("id" varchar PRIMARY KEY NOT NULL, "name" varchar NOT NULL, "workflow" text NOT NULL, "enabled" boolean NOT NULL)`);
    await queryRunner.query(`CREATE TABLE "plugin_variable" ("variableName" varchar NOT NULL, "pluginId" varchar NOT NULL, "value" text NOT NULL, PRIMARY KEY ("variableName", "pluginId"))`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "plugin"`);
  }

}
