import { MigrationInterface, QueryRunner } from 'typeorm';

import { insertItemIntoTable } from '~/database/insertItemIntoTable';

export class retypeTimestampAttribute1659639416172 implements MigrationInterface {
  name = 'retypeTimestampAttribute1659639416172';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const items = await queryRunner.query(`SELECT * from \`cooldown\``);
    await queryRunner.query(`DELETE from \`cooldown\` WHERE 1=1`);

    await queryRunner.query(`ALTER TABLE \`cooldown_viewer\` DROP FOREIGN KEY \`FK_5ba6ccf5a51426111e322c80445\``);
    await queryRunner.query(`ALTER TABLE \`cooldown\` DROP COLUMN \`timestamp\``);
    await queryRunner.query(`ALTER TABLE \`cooldown\` ADD \`timestamp\` varchar(30) NOT NULL`);

    for (const item of items) {
      await insertItemIntoTable('cooldown', {
        ...item,
        timestamp: new Date(item.timestamp).toISOString(),
      }, queryRunner);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    return;
  }

}