import { MigrationInterface, QueryRunner } from 'typeorm';
import { insertItemIntoTable } from '~/database/insertItemIntoTable';

export class updatePermissions1666167883934 implements MigrationInterface {
  name = 'updatePermissions1666167883934';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const items = await queryRunner.query(`SELECT * from "permissions"`);
    const items2 = await queryRunner.query(`SELECT * from "permissions_filter"`);

    await queryRunner.query(`DROP TABLE "permissions_filter"`);
    await queryRunner.query(`DELETE FROM "permissions" WHERE 1=1`);

    for (const item of items) {
      item.filters = JSON.stringify(items2.filter((o: { permissionId: any; }) => o.permissionId === item.id));
      await insertItemIntoTable('permissions', {
        ...item,
      }, queryRunner);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    return;
  }

}
