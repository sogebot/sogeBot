import { MigrationInterface, QueryRunner } from 'typeorm';

export class aliasGroup1589290695701 implements MigrationInterface {
  name = 'aliasGroup1589290695701';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE `alias` ADD `group` varchar(255) NULL', undefined);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE `alias` DROP COLUMN `group`', undefined);
  }

}
