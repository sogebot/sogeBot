import { MigrationInterface, QueryRunner } from 'typeorm';

import { insertItemIntoTable } from '~/database/insertItemIntoTable';

export class retypeTimestampAttribute1659639416172 implements MigrationInterface {
  name = 'retypeTimestampAttribute1659639416172';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const items = await queryRunner.query(`SELECT * from \`cooldown\``);
    await queryRunner.query(`DELETE from \`cooldown\` WHERE 1=1`);
    await queryRunner.query(`DROP TABLE \`cooldown_viewer\``);

    await queryRunner.query(`ALTER TABLE \`cooldown\` DROP COLUMN \`timestamp\``);
    await queryRunner.query(`ALTER TABLE \`cooldown\` ADD \`timestamp\` varchar(30) NOT NULL`);

    for (const item of items) {
      await insertItemIntoTable('cooldown', {
        ...item,
        timestamp: new Date(0).toISOString(),
      }, queryRunner);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    return;
  }

}