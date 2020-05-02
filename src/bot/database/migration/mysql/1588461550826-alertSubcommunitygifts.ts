import {MigrationInterface, QueryRunner} from 'typeorm';

export class alertSubcommunitygifts1588461550826 implements MigrationInterface {
  name = 'alertSubcommunitygifts1588461550826';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('RENAME TABLE `alert_subgift` TO `alert_subcommunitygift`', undefined);
    await queryRunner.query('CREATE TABLE `alert_subgift` (`id` varchar(36) NOT NULL, `alertId` varchar(255) NULL, `enabled` tinyint NOT NULL, `title` varchar(255) NOT NULL, `variantCondition` varchar(255) NOT NULL, `variantAmount` int NOT NULL, `messageTemplate` varchar(255) NOT NULL, `layout` varchar(255) NOT NULL, `animationIn` varchar(255) NOT NULL, `animationOut` varchar(255) NOT NULL, `animationText` varchar(255) NOT NULL, `animationTextOptions` text NOT NULL, `imageId` varchar(255) NOT NULL, `soundId` varchar(255) NOT NULL, `soundVolume` int NOT NULL, `alertDurationInMs` int NOT NULL, `alertTextDelayInMs` int NOT NULL, `enableAdvancedMode` tinyint NOT NULL, `advancedMode` text NOT NULL, `tts` text NOT NULL, `font` text NOT NULL, PRIMARY KEY (`id`)) ENGINE=InnoDB', undefined);
    await queryRunner.query('ALTER TABLE `alert_subgift` ADD CONSTRAINT `FK_79f7ce25e52da9ab0085b237eee` FOREIGN KEY (`alertId`) REFERENCES `alert`(`id`) ON DELETE CASCADE ON UPDATE CASCADE', undefined);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "alert_subgift"`, undefined);
    await queryRunner.query('RENAME TABLE `alert_subcommunitygift` TO `alert_subgift`', undefined);
  }

}
