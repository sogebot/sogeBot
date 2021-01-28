import { MigrationInterface, QueryRunner } from 'typeorm';

export class valuesJsonToText1573940087256 implements MigrationInterface {
  name = 'valuesJsonToText1573940087256';

  public async up(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(`ALTER TABLE "event_list" ALTER COLUMN "values_json" SET DATA TYPE text`, undefined);
  }

  public async down(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(`ALTER TABLE "event_list" ALTER COLUMN "values_json" SET DATA TYPE character varying`, undefined);
  }

}
