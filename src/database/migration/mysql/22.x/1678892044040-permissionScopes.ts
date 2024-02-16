import { MigrationInterface, QueryRunner } from 'typeorm';

import defaultPermissions from '../../../../helpers/permissions/defaultPermissions.js';
import { insertItemIntoTable } from '../../../insertItemIntoTable.js';

export class permissionScopes1678892044040 implements MigrationInterface {
  name = 'permissionScopes1678892044040';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const items = await queryRunner.query(`SELECT * FROM \`permissions\``);
    await queryRunner.query(`DROP TABLE \`permissions\``);
    await queryRunner.query(`CREATE TABLE \`permissions\` (\`id\` varchar(36) NOT NULL, \`name\` varchar(255) NOT NULL, \`order\` int NOT NULL, \`isCorePermission\` tinyint NOT NULL, \`isWaterfallAllowed\` tinyint NOT NULL, \`automation\` varchar(12) NOT NULL, \`userIds\` text NOT NULL, \`excludeUserIds\` text NOT NULL, \`filters\` json NOT NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
    await queryRunner.query(`ALTER TABLE \`permissions\` ADD \`haveAllScopes\` tinyint NOT NULL DEFAULT 0`);
    await queryRunner.query(`ALTER TABLE \`permissions\` ADD \`excludeSensitiveScopes\` tinyint NOT NULL DEFAULT 1`);
    await queryRunner.query(`ALTER TABLE \`permissions\` ADD \`scopes\` text NOT NULL`);
    for (const item of items) {
      item.scopes = '[]';
      item.haveAllScopes = Number(item.id === defaultPermissions.CASTERS);
      item.excludeSensitiveScopes = Number(item.id !== defaultPermissions.CASTERS);
      await insertItemIntoTable('permissions', item, queryRunner);
    }
    return;
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    return;
  }

}
