import { MigrationInterface, QueryRunner } from 'typeorm';

export class permissionExcludeUserIds1602861448046 implements MigrationInterface {
  name = 'permissionExcludeUserIds1602861448046';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "temporary_permissions" ("id" varchar PRIMARY KEY NOT NULL, "name" varchar NOT NULL, "order" integer NOT NULL, "isCorePermission" boolean NOT NULL, "isWaterfallAllowed" boolean NOT NULL, "automation" varchar(12) NOT NULL, "userIds" text NOT NULL, "excludeUserIds" text NOT NULL DEFAULT '')`);
    await queryRunner.query(`INSERT INTO "temporary_permissions"("id", "name", "order", "isCorePermission", "isWaterfallAllowed", "automation", "userIds") SELECT "id", "name", "order", "isCorePermission", "isWaterfallAllowed", "automation", "userIds" FROM "permissions"`);
    await queryRunner.query(`DROP TABLE "permissions"`);
    await queryRunner.query(`ALTER TABLE "temporary_permissions" RENAME TO "permissions"`);

    await queryRunner.query(`CREATE TABLE "temporary_permissions" ("id" varchar PRIMARY KEY NOT NULL, "name" varchar NOT NULL, "order" integer NOT NULL, "isCorePermission" boolean NOT NULL, "isWaterfallAllowed" boolean NOT NULL, "automation" varchar(12) NOT NULL, "userIds" text NOT NULL, "excludeUserIds" text NOT NULL)`);
    await queryRunner.query(`INSERT INTO "temporary_permissions"("id", "name", "order", "isCorePermission", "isWaterfallAllowed", "automation", "userIds", "excludeUserIds") SELECT "id", "name", "order", "isCorePermission", "isWaterfallAllowed", "automation", "userIds", "excludeUserIds" FROM "permissions"`);
    await queryRunner.query(`DROP TABLE "permissions"`);
    await queryRunner.query(`ALTER TABLE "temporary_permissions" RENAME TO "permissions"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "permissions" RENAME TO "temporary_permissions"`);
    await queryRunner.query(`CREATE TABLE "permissions" ("id" varchar PRIMARY KEY NOT NULL, "name" varchar NOT NULL, "order" integer NOT NULL, "isCorePermission" boolean NOT NULL, "isWaterfallAllowed" boolean NOT NULL, "automation" varchar(12) NOT NULL, "userIds" text NOT NULL)`);
    await queryRunner.query(`INSERT INTO "permissions"("id", "name", "order", "isCorePermission", "isWaterfallAllowed", "automation", "userIds") SELECT "id", "name", "order", "isCorePermission", "isWaterfallAllowed", "automation", "userIds" FROM "temporary_permissions"`);
    await queryRunner.query(`DROP TABLE "temporary_permissions"`);
  }

}
