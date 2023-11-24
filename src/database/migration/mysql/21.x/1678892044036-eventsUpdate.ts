import { MigrationInterface, QueryRunner } from 'typeorm';

export class eventsUpdate1678892044036 implements MigrationInterface {
  name = 'eventsUpdate1678892044036';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX \`IDX_b535fbe8ec6d832dde22065ebd\` ON \`event\``);
    await queryRunner.query(`DROP TABLE \`event_operation\``);
    await queryRunner.query(`DROP TABLE \`event\``);
    await queryRunner.query(`CREATE TABLE \`event\` (\`id\` varchar(36) NOT NULL, \`isEnabled\` tinyint NOT NULL, \`filter\` varchar(255) NOT NULL, \`operations\` json NOT NULL, \`eventName\` text NOT NULL, \`eventTriggered\` json NOT NULL, \`eventDefinitions\` json NOT NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    return;
  }

}
