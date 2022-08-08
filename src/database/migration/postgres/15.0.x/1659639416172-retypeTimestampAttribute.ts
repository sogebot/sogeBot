import { MigrationInterface, QueryRunner } from 'typeorm';

import { insertItemIntoTable } from '~/database/insertItemIntoTable';

export class retypeTimestampAttribute1659639416172 implements MigrationInterface {
  name = 'retypeTimestampAttribute1659639416172';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const items = await queryRunner.query(`SELECT * from "cooldown"`);
    const items2 = await queryRunner.query(`SELECT * from "cooldown_viewer"`);
    await queryRunner.query(`DROP TABLE "cooldown"`);
    await queryRunner.query(`DROP TABLE "cooldown_viewer"`);
    /*
    for (const item of items) {
      await insertItemIntoTable('cooldown', {
        ...item,
        timestamp: new Date(item.timestamp).toISOString(),
      }, queryRunner);
    }

    for (const item of items2) {
      await insertItemIntoTable('cooldown_viewer', {
        ...item,
        timestamp: new Date(item.timestamp).toISOString(),
      }, queryRunner);
    }*/
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    return;
  }

}