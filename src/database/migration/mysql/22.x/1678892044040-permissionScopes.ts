import { MigrationInterface, QueryRunner } from 'typeorm';

import defaultPermissions from '~/helpers/permissions/defaultPermissions';

export class permissionScopes1678892044040 implements MigrationInterface {
  name = 'permissionScopes1678892044040';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`permissions\` ADD \`haveAllScopes\` tinyint NOT NULL DEFAULT 0`);
    await queryRunner.query(`ALTER TABLE \`permissions\` ADD \`scopes\` text NOT NULL DEFAULT `);
    await queryRunner.query(`UPDATE \`permissions\` SET \`haveAllScopes\` = 1 WHERE \`id\` != $1`, [defaultPermissions.CASTERS]);
    return;
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    return;
  }

}
