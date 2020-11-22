import {MigrationInterface, QueryRunner} from 'typeorm';

export class addExtraColumnToUser1605997732116 implements MigrationInterface {
  name = 'addExtraColumnToUser1605997732116';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE `user` ADD `extra` text NOT NULL DEFAULT \'{}\'');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE `user` DROP COLUMN `extra`');
  }

}
