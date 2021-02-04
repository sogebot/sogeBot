import { MigrationInterface, QueryRunner } from 'typeorm';

export class alertsFilter1610021167187 implements MigrationInterface {
  name = 'alertsFilter1610021167187';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE `alert_follow` DROP COLUMN `variantCondition`');
    await queryRunner.query('ALTER TABLE `alert_follow` ADD `filter` text NULL');
    await queryRunner.query('ALTER TABLE `alert_sub` DROP COLUMN `variantCondition`');
    await queryRunner.query('ALTER TABLE `alert_sub` ADD `filter` text NULL');
    await queryRunner.query('ALTER TABLE `alert_subcommunitygift` DROP COLUMN `variantCondition`');
    await queryRunner.query('ALTER TABLE `alert_subcommunitygift` ADD `filter` text NULL');
    await queryRunner.query('ALTER TABLE `alert_subgift` DROP COLUMN `variantCondition`');
    await queryRunner.query('ALTER TABLE `alert_subgift` ADD `filter` text NULL');
    await queryRunner.query('ALTER TABLE `alert_host` DROP COLUMN `variantCondition`');
    await queryRunner.query('ALTER TABLE `alert_host` ADD `filter` text NULL');
    await queryRunner.query('ALTER TABLE `alert_raid` DROP COLUMN `variantCondition`');
    await queryRunner.query('ALTER TABLE `alert_raid` ADD `filter` text NULL');
    await queryRunner.query('ALTER TABLE `alert_tip` DROP COLUMN `variantCondition`');
    await queryRunner.query('ALTER TABLE `alert_tip` ADD `filter` text NULL');
    await queryRunner.query('ALTER TABLE `alert_cheer` DROP COLUMN `variantCondition`');
    await queryRunner.query('ALTER TABLE `alert_cheer` ADD `filter` text NULL');
    await queryRunner.query('ALTER TABLE `alert_resub` DROP COLUMN `variantCondition`');
    await queryRunner.query('ALTER TABLE `alert_resub` ADD `filter` text NULL');
    await queryRunner.query('ALTER TABLE `alert_command_redeem` DROP COLUMN `variantCondition`');
    await queryRunner.query('ALTER TABLE `alert_command_redeem` ADD `filter` text NULL');
    await queryRunner.query('ALTER TABLE `alert_reward_redeem` DROP COLUMN `variantCondition`');
    await queryRunner.query('ALTER TABLE `alert_reward_redeem` ADD `filter` text NULL');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE `alert_reward_redeem` DROP COLUMN `filter`');
    await queryRunner.query('ALTER TABLE `alert_reward_redeem` ADD `variantCondition` varchar(255) NOT NULL');
    await queryRunner.query('ALTER TABLE `alert_command_redeem` DROP COLUMN `filter`');
    await queryRunner.query('ALTER TABLE `alert_command_redeem` ADD `variantCondition` varchar(255) NOT NULL');
    await queryRunner.query('ALTER TABLE `alert_resub` DROP COLUMN `filter`');
    await queryRunner.query('ALTER TABLE `alert_resub` ADD `variantCondition` varchar(255) NOT NULL');
    await queryRunner.query('ALTER TABLE `alert_cheer` DROP COLUMN `filter`');
    await queryRunner.query('ALTER TABLE `alert_cheer` ADD `variantCondition` varchar(255) NOT NULL');
    await queryRunner.query('ALTER TABLE `alert_tip` DROP COLUMN `filter`');
    await queryRunner.query('ALTER TABLE `alert_tip` ADD `variantCondition` varchar(255) NOT NULL');
    await queryRunner.query('ALTER TABLE `alert_raid` DROP COLUMN `filter`');
    await queryRunner.query('ALTER TABLE `alert_raid` ADD `variantCondition` varchar(255) NOT NULL');
    await queryRunner.query('ALTER TABLE `alert_host` DROP COLUMN `filter`');
    await queryRunner.query('ALTER TABLE `alert_host` ADD `variantCondition` varchar(255) NOT NULL');
    await queryRunner.query('ALTER TABLE `alert_subgift` DROP COLUMN `filter`');
    await queryRunner.query('ALTER TABLE `alert_subgift` ADD `variantCondition` varchar(255) NOT NULL');
    await queryRunner.query('ALTER TABLE `alert_subcommunitygift` DROP COLUMN `filter`');
    await queryRunner.query('ALTER TABLE `alert_subcommunitygift` ADD `variantCondition` varchar(255) NOT NULL');
    await queryRunner.query('ALTER TABLE `alert_sub` DROP COLUMN `filter`');
    await queryRunner.query('ALTER TABLE `alert_sub` ADD `variantCondition` varchar(255) NOT NULL');
    await queryRunner.query('ALTER TABLE `alert_follow` DROP COLUMN `filter`');
    await queryRunner.query('ALTER TABLE `alert_follow` ADD `variantCondition` varchar(255) NOT NULL');
  }

}
