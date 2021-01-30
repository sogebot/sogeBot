import { MigrationInterface, QueryRunner } from 'typeorm';

export class RanksTypes1582546819777 implements MigrationInterface {
  name = 'RanksTypes1582546819777';

  public async up(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query('DROP INDEX `IDX_93c78c94804a13befdace81904` ON `rank`', undefined);
    await queryRunner.query('ALTER TABLE `rank` CHANGE `hours` `value` int NOT NULL', undefined);
    await queryRunner.query('ALTER TABLE `rank` ADD `type` varchar(255) NOT NULL DEFAULT "viewer"', undefined);
    await queryRunner.query('ALTER TABLE `rank` ALTER COLUMN `type` drop default', undefined);
    await queryRunner.query('CREATE UNIQUE INDEX `IDX_93c78c94804a13befdace81904` ON `rank` (`type`, `value`)', undefined);
  }

  public async down(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query('DROP INDEX `IDX_93c78c94804a13befdace81904` ON `rank`', undefined);
    await queryRunner.query('ALTER TABLE `rank` DROP COLUMN `type`', undefined);
    await queryRunner.query('ALTER TABLE `rank` CHANGE `value` `hours` int NOT NULL', undefined);
    await queryRunner.query('CREATE UNIQUE INDEX `IDX_93c78c94804a13befdace81904` ON `rank` (`hours`)', undefined);
  }

}
