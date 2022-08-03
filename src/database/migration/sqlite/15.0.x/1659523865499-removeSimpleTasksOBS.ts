import { MigrationInterface, QueryRunner } from 'typeorm';

import { insertItemIntoTable } from '~/database/insertItemIntoTable';

export class removeSimpleTasksOBS1659523865499 implements MigrationInterface {
  name = 'removeSimpleTasksOBS1659523865499';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const items = await queryRunner.query(`SELECT * from "obswebsocket"`);
    await queryRunner.query(`DROP TABLE "obswebsocket"`);
    await queryRunner.query(`CREATE TABLE "obswebsocket" ("id" varchar(14) PRIMARY KEY NOT NULL, "name" varchar NOT NULL, "code" text NOT NULL)`);

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
