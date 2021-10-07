import { MigrationInterface, QueryRunner } from 'typeorm';

export class addRaffleIdx1633642061113 implements MigrationInterface {
  name = 'addRaffleIdx1633642061113';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE INDEX "IDX_raffleIsClosed" ON "public"."raffle" ("isClosed") `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_raffleIsClosed"`);
  }

}
