import { MigrationInterface, QueryRunner } from 'typeorm';

import { insertItemIntoTable } from '~/database/insertItemIntoTable';

export class timerAttrChange1661765436386 implements MigrationInterface {
  name = 'timerAttrChange1661765436386';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const items = await queryRunner.query(`SELECT * from \`timer\``);
    const items2 = await queryRunner.query(`SELECT * from \`timer_response\``);
    await queryRunner.query(`DELETE from \`timer_response\` WHERE 1=1`);
    await queryRunner.query(`DELETE from \`timer\` WHERE 1=1`);

    await queryRunner.query(`ALTER TABLE \`timer\` DROP COLUMN \`triggeredAtTimestamp\``);
    await queryRunner.query(`ALTER TABLE \`timer\` ADD \`triggeredAtTimestamp\` varchar(30) NOT NULL DEFAULT '1970-01-01T00:00:00.000Z'`);
    await queryRunner.query(`ALTER TABLE \`timer\` DROP COLUMN \`triggeredAtMessages\``);
    await queryRunner.query(`ALTER TABLE \`timer\` ADD \`triggeredAtMessages\` int NOT NULL DEFAULT '0'`);
    await queryRunner.query(`ALTER TABLE \`timer_response\` DROP COLUMN \`timestamp\``);
    await queryRunner.query(`ALTER TABLE \`timer_response\` ADD \`timestamp\` varchar(30) NOT NULL DEFAULT '1970-01-01T00:00:00.000Z'`);

    for (const item of items) {
      await insertItemIntoTable('timer', {
        ...item,
        triggeredAtTimestamp: new Date(item.triggeredAtTimestamp).toISOString(),
      }, queryRunner);
    }

    for (const item of items2) {
      await insertItemIntoTable('timer_response', {
        ...item,
        timestamp: new Date(item.timestamp).toISOString(),
      }, queryRunner);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    return;
  }

}