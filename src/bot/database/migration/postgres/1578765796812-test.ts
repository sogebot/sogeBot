import {MigrationInterface, QueryRunner} from 'typeorm';

export class test1578765796812 implements MigrationInterface {
  name = 'test1578765796812';

  public async up(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(`ALTER TABLE "carousel" DROP COLUMN "duration"`, undefined);
    await queryRunner.query(`ALTER TABLE "carousel" ADD "duration" character varying NOT NULL`, undefined);
  }

  public async down(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(`ALTER TABLE "carousel" DROP COLUMN "duration"`, undefined);
    await queryRunner.query(`ALTER TABLE "carousel" ADD "duration" integer NOT NULL`, undefined);
  }

}
