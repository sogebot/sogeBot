import { MigrationInterface, QueryRunner } from 'typeorm';

export class highlight1616869485136 implements MigrationInterface {
  name = 'highlight1616869485136';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "highlight" ADD "expired" boolean NOT NULL DEFAULT false`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "highlight" DROP COLUMN "expired"`);
  }

}
