import { MigrationInterface, QueryRunner } from 'typeorm';

import { insertItemIntoTable } from '~/database/insertItemIntoTable';

export class updateAlerts1675089806900 implements MigrationInterface {
  name = 'updateAlerts1675089806900';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const items = await queryRunner.query(`SELECT * from "alert"`);
    await queryRunner.query(`DELETE from "alert" WHERE 1=1`);

    for (const item of items) {
      const updatedItems: any[] = [];
      for (const i of JSON.parse<any>(item.items)) {
        updatedItems.push({
          ...i,
          type: i.type === 'reward_redeem' ? 'rewardredeem' : i.type,
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
