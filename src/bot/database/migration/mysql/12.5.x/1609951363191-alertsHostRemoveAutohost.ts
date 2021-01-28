import { MigrationInterface, QueryRunner } from 'typeorm';

export class alertsHostRemoveAutohost1609951363191 implements MigrationInterface {
  name = 'alertsHostRemoveAutohost1609951363191';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE `alert_host` DROP COLUMN `showAutoHost`');
    await queryRunner.query('ALTER TABLE `alert_raid` DROP COLUMN `showAutoHost`');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE `alert_raid` ADD `showAutoHost` tinyint NOT NULL');
    await queryRunner.query('ALTER TABLE `alert_host` ADD `showAutoHost` tinyint NOT NULL');
  }

}
