import { MigrationInterface, QueryRunner } from 'typeorm';

export class alertsRewardRedeem1604241327525 implements MigrationInterface {
  name = 'alertsRewardRedeem1604241327525';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE TABLE `alert_reward_redeem` (`id` varchar(36) NOT NULL, `alertId` varchar(255) NULL, `enabled` tinyint NOT NULL, `title` varchar(255) NOT NULL, `variantCondition` varchar(255) NOT NULL, `variantAmount` int NOT NULL, `messageTemplate` varchar(255) NOT NULL, `layout` varchar(255) NOT NULL, `animationIn` varchar(255) NOT NULL, `animationInDuration` int NOT NULL DEFAULT 2000, `animationOut` varchar(255) NOT NULL, `animationOutDuration` int NOT NULL DEFAULT 2000, `animationText` varchar(255) NOT NULL, `animationTextOptions` text NOT NULL, `imageId` varchar(255) NOT NULL, `soundId` varchar(255) NOT NULL, `soundVolume` int NOT NULL, `alertDurationInMs` int NOT NULL, `alertTextDelayInMs` int NOT NULL, `enableAdvancedMode` tinyint NOT NULL, `advancedMode` text NOT NULL, `tts` text NOT NULL, `font` text NOT NULL, `message` text NOT NULL, `rewardId` varchar(255) NOT NULL, PRIMARY KEY (`id`)) ENGINE=InnoDB');
    await queryRunner.query('ALTER TABLE `alert_reward_redeem` ADD CONSTRAINT `FK_c55befc36aa21345e5f27513eb3` FOREIGN KEY (`alertId`) REFERENCES `alert`(`id`) ON DELETE CASCADE ON UPDATE CASCADE');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE `alert_reward_redeem` DROP FOREIGN KEY `FK_c55befc36aa21345e5f27513eb3`');
    await queryRunner.query('DROP TABLE `alert_reward_redeem`');
  }

}
