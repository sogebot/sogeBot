import { MigrationInterface, QueryRunner } from 'typeorm';

export class addIntervalToGoals1626478375130 implements MigrationInterface {
  name = 'addIntervalToGoals1626478375130';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE `goal` ADD `interval` bigint NOT NULL');

  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE `goal` DROP COLUMN `interval`');
  }

}
