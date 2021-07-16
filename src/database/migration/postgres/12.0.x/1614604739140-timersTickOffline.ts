import { MigrationInterface, QueryRunner } from 'typeorm';

export class timersTickOffline1614604739140 implements MigrationInterface {
  name = 'timersTickOffline1614604739140';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "timer" ADD "tickOffline" boolean NOT NULL DEFAULT false`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "timer" DROP COLUMN "tickOffline"`);
  }

}
