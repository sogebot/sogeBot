import { MigrationInterface, QueryRunner } from 'typeorm';

export class vuetifyUpdates1626383147273 implements MigrationInterface {
  name = 'vuetifyUpdates1626383147273';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE TABLE `quickaction` (`id` varchar(36) NOT NULL, `userId` varchar(255) NOT NULL, `order` int NOT NULL, `type` varchar(255) NOT NULL, `options` text NOT NULL, PRIMARY KEY (`id`)) ENGINE=InnoDB');
    await queryRunner.query('CREATE TABLE `widget_custom` (`id` varchar(255) NOT NULL, `userId` varchar(255) NOT NULL, `url` varchar(255) NOT NULL, `name` varchar(255) NOT NULL, PRIMARY KEY (`id`)) ENGINE=InnoDB');
    await queryRunner.query('ALTER TABLE `gallery` ADD `folder` varchar(255) NOT NULL DEFAULT \'/\'');
    await queryRunner.query('ALTER TABLE `goal` DROP COLUMN `endAfter`');
    await queryRunner.query('ALTER TABLE `goal` ADD `endAfter` bigint NOT NULL');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE `goal` DROP COLUMN `endAfter`');
    await queryRunner.query('ALTER TABLE `goal` ADD `endAfter` varchar(255) NOT NULL');
    await queryRunner.query('ALTER TABLE `gallery` DROP COLUMN `folder`');
    await queryRunner.query('DROP TABLE `widget_custom`');
    await queryRunner.query('DROP TABLE `quickaction`');
  }

}