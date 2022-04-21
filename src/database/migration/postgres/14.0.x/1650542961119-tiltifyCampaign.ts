import { MigrationInterface, QueryRunner } from 'typeorm';

export class tiltifyCampaign1650542961119 implements MigrationInterface {
  name = 'tiltifyCampaign1650542961119';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "goal" ADD "tiltifyCampaign" integer`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "goal" DROP COLUMN "tiltifyCampaign"`);
  }

}