import { MigrationInterface, QueryRunner } from 'typeorm';

export class PermitByUserId1583162282970 implements MigrationInterface {
  name = 'PermitByUserId1583162282970';

  public async up(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query('DROP INDEX `IDX_f941603aef2741795a9108d0d2` ON `moderation_warning`', undefined);
    await queryRunner.query('DROP INDEX `IDX_69499e78c9ee1602baee77b97d` ON `moderation_permit`', undefined);
    await queryRunner.query('DROP TABLE `moderation_warning`', undefined);
    await queryRunner.query('DROP TABLE `moderation_permit`', undefined);
    await queryRunner.query('CREATE TABLE `moderation_warning` (`id` int NOT NULL AUTO_INCREMENT, `userId` int NOT NULL, `timestamp` bigint NOT NULL DEFAULT 0, PRIMARY KEY (`id`)) ENGINE=InnoDB', undefined);
    await queryRunner.query('CREATE TABLE `moderation_permit` (`id` int NOT NULL AUTO_INCREMENT, `userId` int NOT NULL, PRIMARY KEY (`id`)) ENGINE=InnoDB', undefined);
    await queryRunner.query('CREATE INDEX `IDX_f941603aef2741795a9108d0d2` ON `moderation_warning` (`userId`)', undefined);
    await queryRunner.query('CREATE INDEX `IDX_69499e78c9ee1602baee77b97d` ON `moderation_permit` (`userId`)', undefined);
  }

  public async down(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query('DROP INDEX `IDX_69499e78c9ee1602baee77b97d` ON `moderation_permit`', undefined);
    await queryRunner.query('DROP INDEX `IDX_f941603aef2741795a9108d0d2` ON `moderation_warning`', undefined);
    await queryRunner.query('DROP TABLE `moderation_warning`', undefined);
    await queryRunner.query('DROP TABLE `moderation_permit`', undefined);
    await queryRunner.query('CREATE TABLE `moderation_warning` (`id` int NOT NULL AUTO_INCREMENT, `username` varchar(255) NOT NULL, `timestamp` bigint NOT NULL DEFAULT 0, PRIMARY KEY (`id`)) ENGINE=InnoDB', undefined);
    await queryRunner.query('CREATE TABLE `moderation_permit` (`id` int NOT NULL AUTO_INCREMENT, `username` varchar(255) NOT NULL, PRIMARY KEY (`id`)) ENGINE=InnoDB', undefined);
    await queryRunner.query('CREATE INDEX `IDX_69499e78c9ee1602baee77b97d` ON `moderation_permit` (`username`)', undefined);
    await queryRunner.query('CREATE INDEX `IDX_f941603aef2741795a9108d0d2` ON `moderation_warning` (`username`)', undefined);
  }

}
