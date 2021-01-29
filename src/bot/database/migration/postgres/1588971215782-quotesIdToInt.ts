import { MigrationInterface, QueryRunner } from 'typeorm';

export class quotesIdToInt1588971215782 implements MigrationInterface {
  name = 'quotesIdToInt1588971215782';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "quotes" DROP CONSTRAINT "PK_99a0e8bcbcd8719d3a41f23c263"`, undefined);
    await queryRunner.query(`ALTER TABLE "quotes" DROP COLUMN "id"`, undefined);
    await queryRunner.query(`ALTER TABLE "quotes" ADD "id" SERIAL NOT NULL`, undefined);
    await queryRunner.query(`ALTER TABLE "quotes" ADD CONSTRAINT "PK_99a0e8bcbcd8719d3a41f23c263" PRIMARY KEY ("id")`, undefined);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "quotes" DROP CONSTRAINT "PK_99a0e8bcbcd8719d3a41f23c263"`, undefined);
    await queryRunner.query(`ALTER TABLE "quotes" DROP COLUMN "id"`, undefined);
    await queryRunner.query(`ALTER TABLE "quotes" ADD "id" uuid NOT NULL DEFAULT uuid_generate_v4()`, undefined);
    await queryRunner.query(`ALTER TABLE "quotes" ADD CONSTRAINT "PK_99a0e8bcbcd8719d3a41f23c263" PRIMARY KEY ("id")`, undefined);
  }

}
