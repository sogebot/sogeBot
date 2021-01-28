import { MigrationInterface, QueryRunner } from 'typeorm';

export class addExtraColumnToUser1606067506969 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "user" ADD "extra" text`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "extra"`);
  }

}
