import { MigrationInterface, QueryRunner } from 'typeorm';

export class changeFilterToString1605794954571 implements MigrationInterface {
  name = 'changeFilterToString1605794954571';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "permission_filters" ALTER COLUMN "value" TYPE character varying`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "permission_filters" ALTER COLUMN "value" TYPE bigint`);
  }
}
