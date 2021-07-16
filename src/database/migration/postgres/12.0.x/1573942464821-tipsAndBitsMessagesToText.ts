import { MigrationInterface, QueryRunner } from 'typeorm';

export class tipsAndBitsMessagesToText1573942464821 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query('ALTER TABLE "user_bit" ALTER COLUMN "message" SET DATA TYPE text', undefined);
    await queryRunner.query('ALTER TABLE "user_tip" ALTER COLUMN "message" SET DATA TYPE text', undefined);
    await queryRunner.query('ALTER TABLE "twitch_tag_localization_description" ALTER COLUMN "value" SET DATA TYPE text', undefined);
  }

  public async down(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query('ALTER TABLE "user_bit" ALTER COLUMN "message" SET DATA TYPE character varying', undefined);
    await queryRunner.query('ALTER TABLE "user_tip" ALTER COLUMN "message" SET DATA TYPE character varying', undefined);
    await queryRunner.query('ALTER TABLE "twitch_tag_localization_description" ALTER COLUMN "value" SET DATA TYPE character varying', undefined);
  }

}
