import { MigrationInterface, QueryRunner } from 'typeorm';

export class removeGivenNameEvents1605015996687 implements MigrationInterface {
  name = 'removeGivenNameEvents1605015996687';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE `event` DROP COLUMN `givenName`');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE `event` ADD `givenName` varchar(255) NOT NULL');
  }

}
