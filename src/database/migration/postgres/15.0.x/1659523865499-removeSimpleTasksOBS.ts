import { MigrationInterface, QueryRunner } from 'typeorm';

import { insertItemIntoTable } from '~/database/insertItemIntoTable';

export class removeSimpleTasksOBS1659523865499 implements MigrationInterface {
  name = 'removeSimpleTasksOBS1659523865499';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const items = await queryRunner.query(`SELECT * from "obswebsocket"`);
    await queryRunner.query(`ALTER TABLE "obswebsocket" DROP COLUMN "advancedMode"`);
    await queryRunner.query(`ALTER TABLE "obswebsocket" DROP COLUMN "advancedModeCode"`);
    await queryRunner.query(`ALTER TABLE "obswebsocket" DROP COLUMN "simpleModeTasks"`);
    await queryRunner.query(`ALTER TABLE "obswebsocket" ADD "code" text NOT NULL`);

    for (const item of items) {
      if (item.advancedMode) {
        await insertItemIntoTable('obswebsocket', {
          id:   item.id,
          name: item.name,
          code: item.advancedModeCode,
        }, queryRunner);
      } else {
        console.log(`Task ${item.id} removed as it is simple task mode and it is not being supported anymore.`);
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    return;
  }

}
