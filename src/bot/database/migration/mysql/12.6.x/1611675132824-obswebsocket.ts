import { MigrationInterface, QueryRunner } from 'typeorm';

export class obswebsocket1611675132824 implements MigrationInterface {
  name = 'obswebsocket1611675132824';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE TABLE `obswebsocket` (`id` varchar(14)  NOT NULL, `name` varchar(255) NOT NULL, `advancedMode` tinyint NOT NULL DEFAULT 0, `advancedModeCode` text NOT NULL, `simpleModeTasks` text NOT NULL, PRIMARY KEY (`id`)) ENGINE=InnoDB');
    await queryRunner.query('ALTER TABLE `overlay_mapper` ADD `opts` text NULL');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE `overlay_mapper` DROP COLUMN `opts`');
    await queryRunner.query('DROP TABLE `obswebsocket`');
  }

}
