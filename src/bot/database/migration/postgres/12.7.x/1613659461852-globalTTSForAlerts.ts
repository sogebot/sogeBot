import { MigrationInterface, QueryRunner } from 'typeorm';

export class globalTTSForAlerts1613659461852 implements MigrationInterface {
  name = 'globalTTSForAlerts1613659461852';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "alert" ADD "tts" text`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "alert" DROP COLUMN "tts"`);
  }

}
