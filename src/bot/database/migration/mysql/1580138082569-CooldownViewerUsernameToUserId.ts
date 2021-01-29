import { MigrationInterface, QueryRunner } from 'typeorm';

export class CooldownViewerUsernameToUserId1580138082569 implements MigrationInterface {
  name = 'CooldownViewerUsernameToUserId1580138082569';

  public async up(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query('TRUNCATE TABLE `cooldown_viewer`', undefined);
    await queryRunner.query('ALTER TABLE `cooldown_viewer` CHANGE `username` `userId` varchar(255) NOT NULL', undefined);
    await queryRunner.query('ALTER TABLE `cooldown_viewer` DROP COLUMN `userId`', undefined);
    await queryRunner.query('ALTER TABLE `cooldown_viewer` ADD `userId` int NOT NULL', undefined);
  }

  public async down(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query('TRUNCATE TABLE `cooldown_viewer`', undefined);
    await queryRunner.query('ALTER TABLE `cooldown_viewer` DROP COLUMN `userId`', undefined);
    await queryRunner.query('ALTER TABLE `cooldown_viewer` ADD `userId` varchar(255) NOT NULL', undefined);
    await queryRunner.query('ALTER TABLE `cooldown_viewer` CHANGE `userId` `username` varchar(255) NOT NULL', undefined);
  }

}
