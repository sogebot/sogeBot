import { MigrationInterface, QueryRunner } from 'typeorm';

export class removeText1678892044032 implements MigrationInterface {
  name = 'removeText1678892044032';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "text"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    return;
  }

}
