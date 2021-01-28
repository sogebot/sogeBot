import { MigrationInterface, QueryRunner } from 'typeorm';

export class RanksTypes1582546688571 implements MigrationInterface {
  name = 'RanksTypes1582546688571';

  public async up(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(`DROP INDEX "IDX_93c78c94804a13befdace81904"`, undefined);
    await queryRunner.query(`ALTER TABLE "rank" RENAME COLUMN "hours" TO "value"`, undefined);
    await queryRunner.query(`ALTER TABLE "rank" ADD "type" character varying NOT NULL DEFAULT 'viewer'`, undefined);
    await queryRunner.query(`ALTER TABLE "rank" ALTER COLUMN "type" drop default`, undefined);
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_93c78c94804a13befdace81904" ON "rank" ("type", "value") `, undefined);
  }

  public async down(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(`DROP INDEX "IDX_93c78c94804a13befdace81904"`, undefined);
    await queryRunner.query(`ALTER TABLE "rank" DROP COLUMN "type"`, undefined);
    await queryRunner.query(`ALTER TABLE "rank" RENAME COLUMN "balue" TO "hours"`, undefined);
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_93c78c94804a13befdace81904" ON "rank" ("hours") `, undefined);
  }

}
