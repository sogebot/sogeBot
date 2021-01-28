import { MigrationInterface, QueryRunner } from 'typeorm';

export class quotesIdToInt1588973421498 implements MigrationInterface {
  name = 'quotesIdToInt1588973421498';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE `quotes` DROP PRIMARY KEY', undefined);
    await queryRunner.query('ALTER TABLE `quotes` DROP COLUMN `id`', undefined);
    await queryRunner.query('ALTER TABLE `quotes` ADD `id` int NOT NULL PRIMARY KEY AUTO_INCREMENT', undefined);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE `quotes` DROP COLUMN `id`', undefined);
    await queryRunner.query('ALTER TABLE `quotes` ADD `id` varchar(36) NOT NULL', undefined);
    await queryRunner.query('ALTER TABLE `quotes` ADD PRIMARY KEY (`id`)', undefined);
  }

}
