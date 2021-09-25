import { MigrationInterface, QueryRunner } from 'typeorm';

export class addBannedEvents1632608140510 implements MigrationInterface {
  name = 'addBannedEvents1632608140510';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE \`banned_events\` (\`id\` varchar(255) NOT NULL, \`event_type\` varchar(255) NOT NULL, \`event_timestamp\` varchar(255) NOT NULL, \`version\` varchar(255) NOT NULL, \`event_data\` text NOT NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE \`banned_events\``);
  }

}
