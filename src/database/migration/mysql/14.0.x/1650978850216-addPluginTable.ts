import { MigrationInterface, QueryRunner } from 'typeorm';

export class addPluginTable1650978850216 implements MigrationInterface {
  name = 'addPluginTable1650978850216';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE \`plugin\` (\`id\` varchar(255) NOT NULL, \`name\` varchar(255) NOT NULL, \`enabled\` tinyint NOT NULL, \`workflow\` longtext NOT NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
    await queryRunner.query(`CREATE TABLE \`plugin_variable\` (\`variableName\` varchar(255) NOT NULL, \`pluginId\` varchar(255) NOT NULL, \`value\` longtext NOT NULL, PRIMARY KEY (\`variableName\`, \`pluginId\`)) ENGINE=InnoDB`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE \`plugin_variable\``);
    await queryRunner.query(`DROP TABLE \`plugin\``);
  }

}
