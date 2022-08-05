import { MigrationInterface, QueryRunner } from 'typeorm';

import { insertItemIntoTable } from '../../../insertItemIntoTable';

export class removeFollowersPermissionOBS1659523865500 implements MigrationInterface {
  name = 'removeFollowersPermissionOBS1659523865500';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const items = await queryRunner.query(`SELECT * from \`permissions\``);
    await queryRunner.query(`DELETE FROM \`permissions\` WHERE 1=1`);

    let order = 0;
    for (const item of items) {
      if (item.automation !== 'followers') {
        item.order = order;
        await insertItemIntoTable('permissions', item, queryRunner);
        order++;
      } else {
        console.log(`Followers permission dropped`);
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    return;
  }

}
