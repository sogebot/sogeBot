import { MigrationInterface, QueryRunner } from 'typeorm';

export class alertSubcommunitygifts1588466411787 implements MigrationInterface {
  name = 'alertSubcommunitygifts1588466411787';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE TABLE `alert_subcommunitygift` (`id` varchar(36) NOT NULL, `alertId` varchar(255) NULL, `enabled` tinyint NOT NULL, `title` varchar(255) NOT NULL, `variantCondition` varchar(255) NOT NULL, `variantAmount` int NOT NULL, `messageTemplate` varchar(255) NOT NULL, `layout` varchar(255) NOT NULL, `animationIn` varchar(255) NOT NULL, `animationOut` varchar(255) NOT NULL, `animationText` varchar(255) NOT NULL, `animationTextOptions` text NOT NULL, `imageId` varchar(255) NOT NULL, `soundId` varchar(255) NOT NULL, `soundVolume` int NOT NULL, `alertDurationInMs` int NOT NULL, `alertTextDelayInMs` int NOT NULL, `enableAdvancedMode` tinyint NOT NULL, `advancedMode` text NOT NULL, `tts` text NOT NULL, `font` text NOT NULL, PRIMARY KEY (`id`)) ENGINE=InnoDB', undefined);
    await queryRunner.query('ALTER TABLE `alert_subcommunitygift` ADD CONSTRAINT `FK_5cfd9f1ade011e11fd21a2f5bee` FOREIGN KEY (`alertId`) REFERENCES `alert`(`id`) ON DELETE CASCADE ON UPDATE CASCADE', undefined);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE `alert_subcommunitygift` DROP FOREIGN KEY `FK_5cfd9f1ade011e11fd21a2f5bee`', undefined);
    await queryRunner.query('DROP TABLE `alert_subcommunitygift`', undefined);
  }

}
