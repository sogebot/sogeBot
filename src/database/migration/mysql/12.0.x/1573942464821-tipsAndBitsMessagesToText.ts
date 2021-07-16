import { MigrationInterface, QueryRunner } from 'typeorm';

export class tipsAndBitsMessagesToText1573942464821 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query('ALTER TABLE `user_bit` MODIFY COLUMN `message` text', undefined);
    await queryRunner.query('ALTER TABLE `user_tip` MODIFY COLUMN `message` text', undefined);
    await queryRunner.query('ALTER TABLE `twitch_tag_localization_description` MODIFY COLUMN `value` text', undefined);

  }

  public async down(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query('ALTER TABLE `user_tip` MODIFY COLUMN `message` varchar(255)', undefined);
    await queryRunner.query('ALTER TABLE `user_bit` MODIFY COLUMN `message` varchar(255)', undefined);
    await queryRunner.query('ALTER TABLE `twitch_tag_localization_description` MODIFY COLUMN `value` varchar(255)', undefined);
  }

}
