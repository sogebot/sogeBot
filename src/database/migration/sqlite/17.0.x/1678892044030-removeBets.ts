import { MigrationInterface, QueryRunner } from 'typeorm';

export class removeBets678892044030 implements MigrationInterface {
  name = 'removeBets1678892044030';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "bets"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    return;
  }

}
