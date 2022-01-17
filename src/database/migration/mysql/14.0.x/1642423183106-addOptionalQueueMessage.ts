import { MigrationInterface, QueryRunner } from 'typeorm';

export class addOptionalQueueMessage1642423183106 implements MigrationInterface {
  name = 'addOptionalQueueMessage1642423183106';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`queue\` ADD \`message\` varchar(255)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    return;
  }

}
