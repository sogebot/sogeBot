import { MigrationInterface, QueryRunner } from 'typeorm';

export class permissionExcludeUserIds1602861448046 implements MigrationInterface {
  name = 'permissionExcludeUserIds1602861448046';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE `permissions` ADD `excludeUserIds` text NOT NULL');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE `permissions` DROP COLUMN `excludeUserIds`');
  }

}
