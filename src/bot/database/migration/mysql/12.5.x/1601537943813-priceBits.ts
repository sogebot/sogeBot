import { MigrationInterface, QueryRunner } from 'typeorm';

export class priceBits1601537943813 implements MigrationInterface {
  name = 'priceBits1601537943813';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE `price` ADD `priceBits` int NOT NULL DEFAULT 0');
    await queryRunner.query('ALTER TABLE `price` ADD `emitRedeemEvent` tinyint NOT NULL DEFAULT 0');
    await queryRunner.query('CREATE TABLE `alert_command_redeem` (`id` varchar(36) NOT NULL, `alertId` varchar(255) NULL, `enabled` tinyint NOT NULL, `title` varchar(255) NOT NULL, `variantCondition` varchar(255) NOT NULL, `variantAmount` int NOT NULL, `messageTemplate` varchar(255) NOT NULL, `layout` varchar(255) NOT NULL, `animationIn` varchar(255) NOT NULL, `animationInDuration` int NOT NULL DEFAULT 2000, `animationOut` varchar(255) NOT NULL, `animationOutDuration` int NOT NULL DEFAULT 2000, `animationText` varchar(255) NOT NULL, `animationTextOptions` text NOT NULL, `imageId` varchar(255) NOT NULL, `soundId` varchar(255) NOT NULL, `soundVolume` int NOT NULL, `alertDurationInMs` int NOT NULL, `alertTextDelayInMs` int NOT NULL, `enableAdvancedMode` tinyint NOT NULL, `advancedMode` text NOT NULL, `tts` text NOT NULL, `font` text NOT NULL, PRIMARY KEY (`id`)) ENGINE=InnoDB');
    await queryRunner.query('ALTER TABLE `alert_command_redeem` ADD CONSTRAINT `FK_d118fd8e1d7f331372e95b7e235` FOREIGN KEY (`alertId`) REFERENCES `alert`(`id`) ON DELETE CASCADE ON UPDATE CASCADE');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE `price` DROP COLUMN `emitRedeemEvent`');
    await queryRunner.query('ALTER TABLE `price` DROP COLUMN `priceBits`');
    await queryRunner.query('ALTER TABLE `alert_command_redeem` DROP FOREIGN KEY `FK_d118fd8e1d7f331372e95b7e235`');
    await queryRunner.query('DROP TABLE `alert_command_redeem`');
  }

}
