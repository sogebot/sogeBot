import { MigrationInterface, QueryRunner } from 'typeorm';

export class alertsImageOptions1609160442869 implements MigrationInterface {
  name = 'alertsImageOptions1609160442869';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE `alert_follow` ADD `imageOptions` text');
    await queryRunner.query('ALTER TABLE `alert_sub` ADD `imageOptions` text');
    await queryRunner.query('ALTER TABLE `alert_subcommunitygift` ADD `imageOptions` text');
    await queryRunner.query('ALTER TABLE `alert_subgift` ADD `imageOptions` text');
    await queryRunner.query('ALTER TABLE `alert_host` ADD `imageOptions` text');
    await queryRunner.query('ALTER TABLE `alert_raid` ADD `imageOptions` text');
    await queryRunner.query('ALTER TABLE `alert_tip` ADD `imageOptions` text');
    await queryRunner.query('ALTER TABLE `alert_cheer` ADD `imageOptions` text');
    await queryRunner.query('ALTER TABLE `alert_resub` ADD `imageOptions` text');
    await queryRunner.query('ALTER TABLE `alert_command_redeem` ADD `imageOptions` text');
    await queryRunner.query('ALTER TABLE `alert_reward_redeem` ADD `imageOptions` text');

    await queryRunner.query('UPDATE `alert_follow` SET `imageOptions`=\'{"translateX":0,"translateY":0,"scale":100}\'');
    await queryRunner.query('UPDATE `alert_sub` SET `imageOptions`=\'{"translateX":0,"translateY":0,"scale":100}\'');
    await queryRunner.query('UPDATE `alert_subcommunitygift` SET `imageOptions`=\'{"translateX":0,"translateY":0,"scale":100}\'');
    await queryRunner.query('UPDATE `alert_subgift` SET `imageOptions`=\'{"translateX":0,"translateY":0,"scale":100}\'');
    await queryRunner.query('UPDATE `alert_host` SET `imageOptions`=\'{"translateX":0,"translateY":0,"scale":100}\'');
    await queryRunner.query('UPDATE `alert_raid` SET `imageOptions`=\'{"translateX":0,"translateY":0,"scale":100}\'');
    await queryRunner.query('UPDATE `alert_tip` SET `imageOptions`=\'{"translateX":0,"translateY":0,"scale":100}\'');
    await queryRunner.query('UPDATE `alert_cheer` SET `imageOptions`=\'{"translateX":0,"translateY":0,"scale":100}\'');
    await queryRunner.query('UPDATE `alert_resub` SET `imageOptions`=\'{"translateX":0,"translateY":0,"scale":100}\'');
    await queryRunner.query('UPDATE `alert_command_redeem` SET `imageOptions`=\'{"translateX":0,"translateY":0,"scale":100}\'');
    await queryRunner.query('UPDATE `alert_reward_redeem` SET `imageOptions`=\'{"translateX":0,"translateY":0,"scale":100}\'');

    await queryRunner.query('ALTER TABLE `alert_follow` CHANGE `imageOptions` `imageOptions` text NOT NULL');
    await queryRunner.query('ALTER TABLE `alert_sub` CHANGE `imageOptions` `imageOptions` text NOT NULL');
    await queryRunner.query('ALTER TABLE `alert_subcommunitygift` CHANGE `imageOptions` `imageOptions` text NOT NULL');
    await queryRunner.query('ALTER TABLE `alert_subgift` CHANGE `imageOptions` `imageOptions` text NOT NULL');
    await queryRunner.query('ALTER TABLE `alert_host` CHANGE `imageOptions` `imageOptions` text NOT NULL');
    await queryRunner.query('ALTER TABLE `alert_raid` CHANGE `imageOptions` `imageOptions` text NOT NULL');
    await queryRunner.query('ALTER TABLE `alert_tip` CHANGE `imageOptions` `imageOptions` text NOT NULL');
    await queryRunner.query('ALTER TABLE `alert_cheer` CHANGE `imageOptions` `imageOptions` text NOT NULL');
    await queryRunner.query('ALTER TABLE `alert_resub` CHANGE `imageOptions` `imageOptions` text NOT NULL');
    await queryRunner.query('ALTER TABLE `alert_command_redeem` CHANGE `imageOptions` `imageOptions` text NOT NULL');
    await queryRunner.query('ALTER TABLE `alert_reward_redeem` CHANGE `imageOptions` `imageOptions` text NOT NULL');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE `alert_reward_redeem` DROP COLUMN `imageOptions`');
    await queryRunner.query('ALTER TABLE `alert_command_redeem` DROP COLUMN `imageOptions`');
    await queryRunner.query('ALTER TABLE `alert_resub` DROP COLUMN `imageOptions`');
    await queryRunner.query('ALTER TABLE `alert_cheer` DROP COLUMN `imageOptions`');
    await queryRunner.query('ALTER TABLE `alert_tip` DROP COLUMN `imageOptions`');
    await queryRunner.query('ALTER TABLE `alert_raid` DROP COLUMN `imageOptions`');
    await queryRunner.query('ALTER TABLE `alert_host` DROP COLUMN `imageOptions`');
    await queryRunner.query('ALTER TABLE `alert_subgift` DROP COLUMN `imageOptions`');
    await queryRunner.query('ALTER TABLE `alert_subcommunitygift` DROP COLUMN `imageOptions`');
    await queryRunner.query('ALTER TABLE `alert_sub` DROP COLUMN `imageOptions`');
    await queryRunner.query('ALTER TABLE `alert_follow` DROP COLUMN `imageOptions`');
  }

}
