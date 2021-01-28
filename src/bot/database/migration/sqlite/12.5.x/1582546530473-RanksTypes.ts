import { MigrationInterface, QueryRunner } from 'typeorm';

export class RanksTypes1582546530473 implements MigrationInterface {
  name = 'RanksTypes1582546530473';

  public async up(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(`DROP INDEX "IDX_93c78c94804a13befdace81904"`, undefined);
    await queryRunner.query(`CREATE TABLE "temporary_rank" ("id" varchar PRIMARY KEY NOT NULL, "rank" varchar NOT NULL, "value" integer NOT NULL, "type" varchar NOT NULL DEFAULT ('viewer'))`, undefined);
    await queryRunner.query(`INSERT INTO "temporary_rank"("id", "rank", "value") SELECT "id", "rank", "hours" FROM "rank"`, undefined);
    await queryRunner.query(`DROP TABLE "rank"`, undefined);
    await queryRunner.query(`ALTER TABLE "temporary_rank" RENAME TO "rank"`, undefined);
    await queryRunner.query(`CREATE TABLE "temporary_rank" ("id" varchar PRIMARY KEY NOT NULL, "rank" varchar NOT NULL, "value" integer NOT NULL, "type" varchar NOT NULL)`, undefined);
    await queryRunner.query(`INSERT INTO "temporary_rank"("id", "rank", "value", "type") SELECT "id", "rank", "value", "type" FROM "rank"`, undefined);
    await queryRunner.query(`DROP TABLE "rank"`, undefined);
    await queryRunner.query(`ALTER TABLE "temporary_rank" RENAME TO "rank"`, undefined);
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_93c78c94804a13befdace81904" ON "rank" ("type", "value") `, undefined);
  }

  public async down(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(`DROP INDEX "IDX_93c78c94804a13befdace81904"`, undefined);
    await queryRunner.query(`ALTER TABLE "rank" RENAME TO "temporary_rank"`, undefined);
    await queryRunner.query(`CREATE TABLE "rank" ("id" varchar PRIMARY KEY NOT NULL, "hours" integer NOT NULL, "rank" varchar NOT NULL)`, undefined);
    await queryRunner.query(`INSERT INTO "rank"("id", "rank", "hours") SELECT "id", "rank", "value" FROM "temporary_rank"`, undefined);
    await queryRunner.query(`DROP TABLE "temporary_rank"`, undefined);
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_93c78c94804a13befdace81904" ON "rank" ("hours") `, undefined);
  }

}
