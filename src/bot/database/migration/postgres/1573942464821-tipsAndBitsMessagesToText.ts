import {MigrationInterface, QueryRunner} from 'typeorm';

export class tipsAndBitsMessagesToText1573942464821 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query('ALTER TABLE "user_bit" MODIFY COLUMN "message" SET DATA TYPE text', undefined);
    await queryRunner.query('ALTER TABLE "user_tip" MODIFY COLUMN "message" SET DATA TYPE text', undefined);
    await queryRunner.query('ALTER TABLE "twitch_tag_localization_description" MODIFY COLUMN "value" SET DATA TYPE text', undefined);
  }

  public async down(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query('ALTER TABLE "user_bit" MODIFY COLUMN "message" SET DATA TYPE character varying', undefined);
    await queryRunner.query('ALTER TABLE "user_tip" MODIFY COLUMN "message" SET DATA TYPE character varying', undefined);
    await queryRunner.query('ALTER TABLE "twitch_tag_localization_description" MODIFY COLUMN "value" SET DATA TYPE character varying', undefined);
  }

}
