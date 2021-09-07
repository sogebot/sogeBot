import { MigrationInterface, QueryRunner } from 'typeorm';

export class globalFontForAlerts1613738901696 implements MigrationInterface {
  name = 'globalFontForAlerts1613738901696';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // remove old migration
    const response = await queryRunner.query(`SELECT * FROM \`migrations\` WHERE \`name\`='globalFontForAlerts16137389016965'`);
    if (response.length > 0) {
      await queryRunner.query(`DELETE FROM \`migrations\` WHERE \`name\`='globalFontForAlerts16137389016965'`);
      console.log('Skipping migration globalFontForAlerts1613738901696 -> updating globalFontForAlerts16137389016965 to globalFontForAlerts1613738901696');
      return;
    }

    await queryRunner.query('ALTER TABLE `alert` ADD `font` text NOT NULL');
    await queryRunner.query('ALTER TABLE `alert` ADD `fontMessage` text NOT NULL');
    await queryRunner.query('ALTER TABLE `alert_follow` CHANGE `font` `font` text NULL');
    await queryRunner.query('ALTER TABLE `alert_sub` CHANGE `font` `font` text NULL');
    await queryRunner.query('ALTER TABLE `alert_subcommunitygift` CHANGE `font` `font` text NULL');
    await queryRunner.query('ALTER TABLE `alert_subgift` CHANGE `font` `font` text NULL');
    await queryRunner.query('ALTER TABLE `alert_host` CHANGE `font` `font` text NULL');
    await queryRunner.query('ALTER TABLE `alert_raid` CHANGE `font` `font` text NULL');
    await queryRunner.query('ALTER TABLE `alert_tip` CHANGE `font` `font` text NULL');
    await queryRunner.query('ALTER TABLE `alert_cheer` CHANGE `font` `font` text NULL');
    await queryRunner.query('ALTER TABLE `alert_resub` CHANGE `font` `font` text NULL');
    await queryRunner.query('ALTER TABLE `alert_command_redeem` CHANGE `font` `font` text NULL');
    await queryRunner.query('ALTER TABLE `alert_reward_redeem` CHANGE `font` `font` text NULL');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE `alert_reward_redeem` CHANGE `font` `font` text NOT NULL');
    await queryRunner.query('ALTER TABLE `alert_command_redeem` CHANGE `font` `font` text NOT NULL');
    await queryRunner.query('ALTER TABLE `alert_resub` CHANGE `font` `font` text NOT NULL');
    await queryRunner.query('ALTER TABLE `alert_cheer` CHANGE `font` `font` text NOT NULL');
    await queryRunner.query('ALTER TABLE `alert_tip` CHANGE `font` `font` text NOT NULL');
    await queryRunner.query('ALTER TABLE `alert_raid` CHANGE `font` `font` text NOT NULL');
    await queryRunner.query('ALTER TABLE `alert_host` CHANGE `font` `font` text NOT NULL');
    await queryRunner.query('ALTER TABLE `alert_subgift` CHANGE `font` `font` text NOT NULL');
    await queryRunner.query('ALTER TABLE `alert_subcommunitygift` CHANGE `font` `font` text NOT NULL');
    await queryRunner.query('ALTER TABLE `alert_sub` CHANGE `font` `font` text NOT NULL');
    await queryRunner.query('ALTER TABLE `alert_follow` CHANGE `font` `font` text NOT NULL');
    await queryRunner.query('ALTER TABLE `alert` DROP COLUMN `fontMessage`');
    await queryRunner.query('ALTER TABLE `alert` DROP COLUMN `font`');
  }
}
