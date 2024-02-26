import { MigrationInterface, QueryRunner } from 'typeorm';

import defaultPermissions from '../../../../helpers/permissions/defaultPermissions.js';

export class permissionScopes1678892044040 implements MigrationInterface {
  name = 'permissionScopes1678892044040';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "permissions" ADD "haveAllScopes" boolean NOT NULL DEFAULT false`);
    await queryRunner.query(`ALTER TABLE "permissions" ADD "scopes" text NOT NULL`);
    await queryRunner.query('UPDATE "permissions" SET "haveAllScopes" = true WHERE "id" != $1', [defaultPermissions.CASTERS]);
    return;
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    return;
  }

}
