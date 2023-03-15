import { MigrationInterface, QueryRunner } from 'typeorm';

export class addRandomResponsesToggle1675089806900 implements MigrationInterface {
  name = 'addRandomResponsesToggle1675089806900';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`commands\` ADD \`areResponsesRandomized\` tinyint NOT NULL DEFAULT 0`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    return;
  }

}
