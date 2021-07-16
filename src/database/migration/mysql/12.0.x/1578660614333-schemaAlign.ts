import { MigrationInterface, QueryRunner } from 'typeorm';

export class schemaAlign1578660614333 implements MigrationInterface {
  name = 'schemaAlign1578660614333';

  public async up(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query('ALTER TABLE `alert_media` CHANGE `b64data` `b64data` longtext NOT NULL', undefined);
    await queryRunner.query('ALTER TABLE `alias` CHANGE `command` `command` text NOT NULL', undefined);
    await queryRunner.query('ALTER TABLE `commands_responses` CHANGE `response` `response` text NOT NULL', undefined);
    await queryRunner.query('ALTER TABLE `event_list` CHANGE `values_json` `values_json` text NOT NULL', undefined);
    await queryRunner.query('ALTER TABLE `gallery` CHANGE `data` `data` longtext NOT NULL', undefined);
    await queryRunner.query('ALTER TABLE `twitch_tag_localization_description` CHANGE `value` `value` text NOT NULL', undefined);
    await queryRunner.query('ALTER TABLE `user_tip` CHANGE `message` `message` text NOT NULL', undefined);
    await queryRunner.query('ALTER TABLE `user_bit` CHANGE `message` `message` text NOT NULL', undefined);
  }

  public async down(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query('ALTER TABLE `user_bit` CHANGE `message` `message` text NULL', undefined);
    await queryRunner.query('ALTER TABLE `user_tip` CHANGE `message` `message` text NULL', undefined);
    await queryRunner.query('ALTER TABLE `twitch_tag_localization_description` CHANGE `value` `value` text NULL', undefined);
    await queryRunner.query('ALTER TABLE `gallery` CHANGE `data` `data` longtext NULL', undefined);
    await queryRunner.query('ALTER TABLE `event_list` CHANGE `values_json` `values_json` text NULL', undefined);
    await queryRunner.query('ALTER TABLE `commands_responses` CHANGE `response` `response` text NULL', undefined);
    await queryRunner.query('ALTER TABLE `alias` CHANGE `command` `command` text NULL', undefined);
    await queryRunner.query('ALTER TABLE `alert_media` CHANGE `b64data` `b64data` longtext NULL', undefined);
  }

}
