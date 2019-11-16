import {MigrationInterface, QueryRunner} from 'typeorm';

export class aliasCommandText1573940742362 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query('ALTER TABLE `alias` MODIFY COLUMN `command` text', undefined);
  }

  public async down(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query('ALTER TABLE `alias` MODIFY COLUMN `command` varchar(255)', undefined);
  }

}
