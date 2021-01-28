import { MigrationInterface, QueryRunner } from 'typeorm';

export class aliasGroup1589283262462 implements MigrationInterface {
  name = 'aliasGroup1589283262462';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_6a8a594f0a5546f8082b0c405c"`, undefined);
    await queryRunner.query(`CREATE TABLE "temporary_alias" ("id" varchar PRIMARY KEY NOT NULL, "alias" varchar NOT NULL, "command" text NOT NULL, "enabled" boolean NOT NULL, "visible" boolean NOT NULL, "permission" varchar NOT NULL, "group" varchar)`, undefined);
    await queryRunner.query(`INSERT INTO "temporary_alias"("id", "alias", "command", "enabled", "visible", "permission") SELECT "id", "alias", "command", "enabled", "visible", "permission" FROM "alias"`, undefined);
    await queryRunner.query(`DROP TABLE "alias"`, undefined);
    await queryRunner.query(`ALTER TABLE "temporary_alias" RENAME TO "alias"`, undefined);
    await queryRunner.query(`CREATE INDEX "IDX_6a8a594f0a5546f8082b0c405c" ON "alias" ("alias") `, undefined);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_6a8a594f0a5546f8082b0c405c"`, undefined);
    await queryRunner.query(`ALTER TABLE "alias" RENAME TO "temporary_alias"`, undefined);
    await queryRunner.query(`CREATE TABLE "alias" ("id" varchar PRIMARY KEY NOT NULL, "alias" varchar NOT NULL, "command" text NOT NULL, "enabled" boolean NOT NULL, "visible" boolean NOT NULL, "permission" varchar NOT NULL)`, undefined);
    await queryRunner.query(`INSERT INTO "alias"("id", "alias", "command", "enabled", "visible", "permission") SELECT "id", "alias", "command", "enabled", "visible", "permission" FROM "temporary_alias"`, undefined);
    await queryRunner.query(`DROP TABLE "temporary_alias"`, undefined);
    await queryRunner.query(`CREATE INDEX "IDX_6a8a594f0a5546f8082b0c405c" ON "alias" ("alias") `, undefined);
  }

}
