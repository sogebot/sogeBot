import { MigrationInterface, QueryRunner } from 'typeorm';

export class aliasGroup1589290567071 implements MigrationInterface {
  name = 'aliasGroup1589290567071';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "alias" ADD "group" character varying`, undefined);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "alias" DROP COLUMN "group"`, undefined);
  }

}
