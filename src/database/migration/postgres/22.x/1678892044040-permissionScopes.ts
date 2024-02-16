import { MigrationInterface, QueryRunner } from 'typeorm';

import defaultPermissions from '../../../../helpers/permissions/defaultPermissions.js';
import { insertItemIntoTable } from '../../../insertItemIntoTable.js';

export class permissionScopes1678892044040 implements MigrationInterface {
  name = 'permissionScopes1678892044040';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const items = await queryRunner.query(`SELECT * FROM "permissions"`);
    await queryRunner.query(`DROP TABLE "permissions"`);
    await queryRunner.query(`CREATE TABLE "permissions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "order" integer NOT NULL, "isCorePermission" boolean NOT NULL, "isWaterfallAllowed" boolean NOT NULL, "automation" character varying(12) NOT NULL, "userIds" text NOT NULL, "excludeUserIds" text NOT NULL, "filters" json NOT NULL, CONSTRAINT "PK_920331560282b8bd21bb02290df" PRIMARY KEY ("id"))`);
    await queryRunner.query(`ALTER TABLE "permissions" ADD "haveAllScopes" boolean NOT NULL DEFAULT false`);
    await queryRunner.query(`ALTER TABLE "permissions" ADD "excludeSensitiveScopes" boolean NOT NULL DEFAULT true`);
    await queryRunner.query(`ALTER TABLE "permissions" ADD "scopes" text NOT NULL`);
    for (const item of items) {
      item.scopes = '[]';
      item.haveAllScopes = Boolean(item.id === defaultPermissions.CASTERS);
      item.excludeSensitiveScopes = Boolean(item.id !== defaultPermissions.CASTERS);
      await insertItemIntoTable('permissions', item, queryRunner);
    }
    return;
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    return;
  }

}
