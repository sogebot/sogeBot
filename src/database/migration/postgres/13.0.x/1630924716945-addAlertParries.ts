import { MigrationInterface, QueryRunner } from 'typeorm';

export class addAlertParries1630924716945 implements MigrationInterface {
  name = 'addAlertParries1630924716945';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM "alert" WHERE 1=1`);
    await queryRunner.query(`ALTER TABLE "alert" ADD "parry" text NOT NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "alert" DROP COLUMN "parry"`);
  }
}
