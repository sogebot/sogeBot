import { MigrationInterface, QueryRunner } from 'typeorm';

export class changeFilterToString1605794954571 implements MigrationInterface {
  name = 'changeFilterToString1605794954571';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "temporary_permission_filters" ("id" varchar PRIMARY KEY NOT NULL, "comparator" varchar(3) NOT NULL, "type" varchar NOT NULL, "value" bigint NOT NULL, "permissionId" varchar, CONSTRAINT "FK_58a2c7864182d942bea393b4420" FOREIGN KEY ("permissionId") REFERENCES "permissions" ("id") ON DELETE CASCADE ON UPDATE CASCADE)`);
    await queryRunner.query(`INSERT INTO "temporary_permission_filters"("id", "comparator", "type", "value", "permissionId") SELECT "id", "comparator", "type", "value", "permissionId" FROM "permission_filters"`);
    await queryRunner.query(`DROP TABLE "permission_filters"`);
    await queryRunner.query(`ALTER TABLE "temporary_permission_filters" RENAME TO "permission_filters"`);
    await queryRunner.query(`CREATE TABLE "temporary_permission_filters" ("id" varchar PRIMARY KEY NOT NULL, "comparator" varchar(3) NOT NULL, "type" varchar NOT NULL, "value" varchar NOT NULL, "permissionId" varchar, CONSTRAINT "FK_58a2c7864182d942bea393b4420" FOREIGN KEY ("permissionId") REFERENCES "permissions" ("id") ON DELETE CASCADE ON UPDATE CASCADE)`);
    await queryRunner.query(`INSERT INTO "temporary_permission_filters"("id", "comparator", "type", "value", "permissionId") SELECT "id", "comparator", "type", "value", "permissionId" FROM "permission_filters"`);
    await queryRunner.query(`DROP TABLE "permission_filters"`);
    await queryRunner.query(`ALTER TABLE "temporary_permission_filters" RENAME TO "permission_filters"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "permission_filters" RENAME TO "temporary_permission_filters"`);
    await queryRunner.query(`CREATE TABLE "permission_filters" ("id" varchar PRIMARY KEY NOT NULL, "comparator" varchar(3) NOT NULL, "type" varchar NOT NULL, "value" bigint NOT NULL, "permissionId" varchar, CONSTRAINT "FK_58a2c7864182d942bea393b4420" FOREIGN KEY ("permissionId") REFERENCES "permissions" ("id") ON DELETE CASCADE ON UPDATE CASCADE)`);
    await queryRunner.query(`INSERT INTO "permission_filters"("id", "comparator", "type", "value", "permissionId") SELECT "id", "comparator", "type", "value", "permissionId" FROM "temporary_permission_filters"`);
    await queryRunner.query(`DROP TABLE "temporary_permission_filters"`);
    await queryRunner.query(`ALTER TABLE "permission_filters" RENAME TO "temporary_permission_filters"`);
    await queryRunner.query(`CREATE TABLE "permission_filters" ("id" varchar PRIMARY KEY NOT NULL, "comparator" varchar(3) NOT NULL, "type" varchar NOT NULL, "value" bigint NOT NULL, "permissionId" varchar, CONSTRAINT "FK_58a2c7864182d942bea393b4420" FOREIGN KEY ("permissionId") REFERENCES "permissions" ("id") ON DELETE CASCADE ON UPDATE CASCADE)`);
    await queryRunner.query(`INSERT INTO "permission_filters"("id", "comparator", "type", "value", "permissionId") SELECT "id", "comparator", "type", "value", "permissionId" FROM "temporary_permission_filters"`);
    await queryRunner.query(`DROP TABLE "temporary_permission_filters"`);
  }

}
