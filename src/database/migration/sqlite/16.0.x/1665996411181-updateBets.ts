import { MigrationInterface, QueryRunner } from 'typeorm';
// import { insertItemIntoTable } from '~/database/insertItemIntoTable';

export class updateBets1665996411181 implements MigrationInterface {
  name = 'updateBets1665996411181';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE from "bets_participations" WHERE 1=1`);
    await queryRunner.query(`DELETE from "bets" WHERE 1=1`);

    await queryRunner.query(`DROP TABLE "bets_participations"`);
    await queryRunner.query(`DROP TABLE "bets"`);

  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    return;
  }

}
