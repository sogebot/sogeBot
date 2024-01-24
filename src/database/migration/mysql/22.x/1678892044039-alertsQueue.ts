import { MigrationInterface, QueryRunner } from 'typeorm';

export class alertsQueue1678892044039 implements MigrationInterface {
  name = 'alertsQueue1678892044039';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE \`alert_queue\` (\`id\` varchar(36) NOT NULL, \`emitData\` json NOT NULL, \`filter\` json NULL, \`passthrough\` tinyint NOT NULL, \`play\` tinyint NOT NULL, \`updatedAt\` varchar(30) NOT NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
    return;
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    return;
  }

}
