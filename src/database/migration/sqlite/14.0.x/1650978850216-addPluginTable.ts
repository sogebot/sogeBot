import { MigrationInterface, QueryRunner } from 'typeorm';

export class addPluginTable1650978850216 implements MigrationInterface {
  name = 'addPluginTable1650978850216';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "plugin" ("id" varchar PRIMARY KEY NOT NULL, "name" varchar NOT NULL, "workflow" text NOT NULL)`);
    await queryRunner.query(`CREATE TABLE "plugin_variable" ("variableName" varchar PRIMARY KEY NOT NULL, "pluginId" varchar PRIMARY KEY NOT NULL, "value" text NOT NULL)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "plugin"`);
  }

}
