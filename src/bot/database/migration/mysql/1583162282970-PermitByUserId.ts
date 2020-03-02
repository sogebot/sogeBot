import {MigrationInterface, QueryRunner} from 'typeorm';

export class PermitByUserId1583162282970 implements MigrationInterface {
  name = 'PermitByUserId1583162282970';

  public async up(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query('DROP INDEX `IDX_f941603aef2741795a9108d0d2` ON `moderation_warning`', undefined);
    await queryRunner.query('DROP INDEX `IDX_69499e78c9ee1602baee77b97d` ON `moderation_permit`', undefined);
    await queryRunner.query('ALTER TABLE `moderation_warning` CHANGE `username` `userId` varchar(255) NOT NULL', undefined);
    await queryRunner.query('ALTER TABLE `moderation_permit` CHANGE `username` `userId` varchar(255) NOT NULL', undefined);
    await queryRunner.query('ALTER TABLE `moderation_warning` DROP COLUMN `userId`', undefined);
    await queryRunner.query('ALTER TABLE `moderation_warning` ADD `userId` int NOT NULL', undefined);
    await queryRunner.query('ALTER TABLE `moderation_permit` DROP COLUMN `userId`', undefined);
    await queryRunner.query('ALTER TABLE `moderation_permit` ADD `userId` int NOT NULL', undefined);
    await queryRunner.query('CREATE INDEX `IDX_f941603aef2741795a9108d0d2` ON `moderation_warning` (`userId`)', undefined);
    await queryRunner.query('CREATE INDEX `IDX_69499e78c9ee1602baee77b97d` ON `moderation_permit` (`userId`)', undefined);
  }

  public async down(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query('DROP INDEX `IDX_69499e78c9ee1602baee77b97d` ON `moderation_permit`', undefined);
    await queryRunner.query('DROP INDEX `IDX_f941603aef2741795a9108d0d2` ON `moderation_warning`', undefined);
    await queryRunner.query('ALTER TABLE `moderation_permit` DROP COLUMN `userId`', undefined);
    await queryRunner.query('ALTER TABLE `moderation_permit` ADD `userId` varchar(255) NOT NULL', undefined);
    await queryRunner.query('ALTER TABLE `moderation_warning` DROP COLUMN `userId`', undefined);
    await queryRunner.query('ALTER TABLE `moderation_warning` ADD `userId` varchar(255) NOT NULL', undefined);
    await queryRunner.query('ALTER TABLE `moderation_permit` CHANGE `userId` `username` varchar(255) NOT NULL', undefined);
    await queryRunner.query('ALTER TABLE `moderation_warning` CHANGE `userId` `username` varchar(255) NOT NULL', undefined);
    await queryRunner.query('CREATE INDEX `IDX_69499e78c9ee1602baee77b97d` ON `moderation_permit` (`username`)', undefined);
    await queryRunner.query('CREATE INDEX `IDX_f941603aef2741795a9108d0d2` ON `moderation_warning` (`username`)', undefined);
  }

}
