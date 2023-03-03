import { MigrationInterface, QueryRunner } from 'typeorm';

import { insertItemIntoTable } from '~/database/insertItemIntoTable';

export class updateAlerts1675089806899 implements MigrationInterface {
  name = 'updateAlerts1675089806899';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const items = await queryRunner.query(`SELECT * from "alert"`);
    await queryRunner.query(`DELETE from "alert" WHERE 1=1`);

    for (const item of items) {
      const updatedItems: any[] = [];
      for (const i of JSON.parse<any>(item.items)) {
        updatedItems.push({
          ...i,
          advancedMode:         i.advancedMode ? JSON.parse(i.advancedMode) : null,
          animationTextOptions: i.animationTextOptions ? JSON.parse(i.animationTextOptions) : null,
          imageOptions:         i.imageOptions ? JSON.parse(i.imageOptions) : null,
          message:              i.message ? JSON.parse(i.message) : null,
          tts:                  i.tts ? JSON.parse(i.tts) : null,
          font:                 i.font ? JSON.parse(i.font) : null,
        });
      }
      item.items = JSON.stringify(updatedItems);
      await insertItemIntoTable('alert', item, queryRunner);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    return;
  }

}
