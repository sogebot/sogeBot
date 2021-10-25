import { MigrationInterface, QueryRunner } from 'typeorm';

export class addAliasGroup1635195800169 implements MigrationInterface {
  name = 'addAliasGroup1635195800169';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_6a8a594f0a5546f8082b0c405c"`);
    await queryRunner.query(`CREATE TABLE "temporary_alias" ("id" varchar PRIMARY KEY NOT NULL, "alias" varchar NOT NULL, "command" text NOT NULL, "enabled" boolean NOT NULL, "visible" boolean NOT NULL, "permission" varchar NOT NULL, "group" varchar)`);
    await queryRunner.query(`INSERT INTO "temporary_alias"("id", "alias", "command", "enabled", "visible", "permission", "group") SELECT "id", "alias", "command", "enabled", "visible", "permission", "group" FROM "alias"`);
    await queryRunner.query(`DROP TABLE "alias"`);
    await queryRunner.query(`ALTER TABLE "temporary_alias" RENAME TO "alias"`);
    await queryRunner.query(`CREATE INDEX "IDX_6a8a594f0a5546f8082b0c405c" ON "alias" ("alias") `);
    await queryRunner.query(`CREATE TABLE "alias_group" ("name" varchar PRIMARY KEY NOT NULL, "options" text NOT NULL)`);
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_alias_group_unique_name" ON "alias_group" ("name") `);
    await queryRunner.query(`DROP INDEX "IDX_6a8a594f0a5546f8082b0c405c"`);
    await queryRunner.query(`CREATE TABLE "temporary_alias" ("id" varchar PRIMARY KEY NOT NULL, "alias" varchar NOT NULL, "command" text NOT NULL, "enabled" boolean NOT NULL, "visible" boolean NOT NULL, "permission" varchar, "group" varchar)`);
    await queryRunner.query(`INSERT INTO "temporary_alias"("id", "alias", "command", "enabled", "visible", "permission", "group") SELECT "id", "alias", "command", "enabled", "visible", "permission", "group" FROM "alias"`);
    await queryRunner.query(`DROP TABLE "alias"`);
    await queryRunner.query(`ALTER TABLE "temporary_alias" RENAME TO "alias"`);
    await queryRunner.query(`CREATE INDEX "IDX_6a8a594f0a5546f8082b0c405c" ON "alias" ("alias") `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_6a8a594f0a5546f8082b0c405c"`);
    await queryRunner.query(`ALTER TABLE "alias" RENAME TO "temporary_alias"`);
    await queryRunner.query(`CREATE TABLE "alias" ("id" varchar PRIMARY KEY NOT NULL, "alias" varchar NOT NULL, "command" text NOT NULL, "enabled" boolean NOT NULL, "visible" boolean NOT NULL, "permission" varchar NOT NULL, "group" varchar)`);
    await queryRunner.query(`INSERT INTO "alias"("id", "alias", "command", "enabled", "visible", "permission", "group") SELECT "id", "alias", "command", "enabled", "visible", "permission", "group" FROM "temporary_alias"`);
    await queryRunner.query(`DROP TABLE "temporary_alias"`);
    await queryRunner.query(`CREATE INDEX "IDX_6a8a594f0a5546f8082b0c405c" ON "alias" ("alias") `);
    await queryRunner.query(`DROP INDEX "IDX_alias_group_unique_name"`);
    await queryRunner.query(`DROP TABLE "alias_group"`);
    await queryRunner.query(`DROP INDEX "IDX_6a8a594f0a5546f8082b0c405c"`);
    await queryRunner.query(`ALTER TABLE "alias" RENAME TO "temporary_alias"`);
    await queryRunner.query(`CREATE TABLE "alias" ("id" varchar PRIMARY KEY NOT NULL, "alias" varchar NOT NULL, "command" text NOT NULL, "enabled" boolean NOT NULL, "visible" boolean NOT NULL, "permission" varchar NOT NULL, "group" varchar)`);
    await queryRunner.query(`INSERT INTO "alias"("id", "alias", "command", "enabled", "visible", "permission", "group") SELECT "id", "alias", "command", "enabled", "visible", "permission", "group" FROM "temporary_alias"`);
    await queryRunner.query(`DROP TABLE "temporary_alias"`);
    await queryRunner.query(`CREATE INDEX "IDX_6a8a594f0a5546f8082b0c405c" ON "alias" ("alias") `);
  }

}