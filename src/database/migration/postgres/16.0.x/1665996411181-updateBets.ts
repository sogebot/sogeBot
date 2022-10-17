import { MigrationInterface, QueryRunner } from 'typeorm';
// import { insertItemIntoTable } from '~/database/insertItemIntoTable';

export class updateBets1665996411181 implements MigrationInterface {
  name = 'updateBets1665996411181';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE from "bets_participations" WHERE 1=1`);
    await queryRunner.query(`DELETE from "bets" WHERE 1=1`);

    await queryRunner.query(`DROP TABLE "bets_participations"`);
    await queryRunner.query(`DROP TABLE "bets"`);

    await queryRunner.query(`CREATE TABLE "bets" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" character varying(30) NOT NULL, "endedAt" character varying(30) NOT NULL, "isLocked" boolean NOT NULL DEFAULT false, "arePointsGiven" boolean NOT NULL DEFAULT false, "options" text NOT NULL, "title" character varying NOT NULL, "participants" json NOT NULL, CONSTRAINT "PK_7ca91a6a39623bd5c21722bcedd" PRIMARY KEY ("id"))`);

  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    return;
  }

}
