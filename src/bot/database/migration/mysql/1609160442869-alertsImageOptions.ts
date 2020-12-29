import {MigrationInterface, QueryRunner} from 'typeorm';

export class alertsImageOptions1609160442869 implements MigrationInterface {
  name = 'alertsImageOptions1609160442869';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE `alert_follow` ADD `imageOptions` text NOT NULL DEFAULT \'{"translateX":0,"translateY":0,"scale":100}\'');
    await queryRunner.query('ALTER TABLE `alert_sub` ADD `imageOptions` text NOT NULL DEFAULT \'{"translateX":0,"translateY":0,"scale":100}\'');
    await queryRunner.query('ALTER TABLE `alert_subcommunitygift` ADD `imageOptions` text NOT NULL DEFAULT \'{"translateX":0,"translateY":0,"scale":100}\'');
    await queryRunner.query('ALTER TABLE `alert_subgift` ADD `imageOptions` text NOT NULL DEFAULT \'{"translateX":0,"translateY":0,"scale":100}\'');
    await queryRunner.query('ALTER TABLE `alert_host` ADD `imageOptions` text NOT NULL DEFAULT \'{"translateX":0,"translateY":0,"scale":100}\'');
    await queryRunner.query('ALTER TABLE `alert_raid` ADD `imageOptions` text NOT NULL DEFAULT \'{"translateX":0,"translateY":0,"scale":100}\'');
    await queryRunner.query('ALTER TABLE `alert_tip` ADD `imageOptions` text NOT NULL DEFAULT \'{"translateX":0,"translateY":0,"scale":100}\'');
    await queryRunner.query('ALTER TABLE `alert_cheer` ADD `imageOptions` text NOT NULL DEFAULT \'{"translateX":0,"translateY":0,"scale":100}\'');
    await queryRunner.query('ALTER TABLE `alert_resub` ADD `imageOptions` text NOT NULL DEFAULT \'{"translateX":0,"translateY":0,"scale":100}\'');
    await queryRunner.query('ALTER TABLE `alert_command_redeem` ADD `imageOptions` text NOT NULL DEFAULT \'{"translateX":0,"translateY":0,"scale":100}\'');
    await queryRunner.query('ALTER TABLE `alert_reward_redeem` ADD `imageOptions` text NOT NULL DEFAULT \'{"translateX":0,"translateY":0,"scale":100}\'');
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
