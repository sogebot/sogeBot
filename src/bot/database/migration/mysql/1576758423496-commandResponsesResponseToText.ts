import {MigrationInterface, QueryRunner} from 'typeorm';

export class commandResponsesResponseToText1576758423496 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query('ALTER TABLE `commands_responses` MODIFY COLUMN `responses` text', undefined);
  }

  public async down(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query('ALTER TABLE `commands_responses` MODIFY COLUMN `responses` varchar(255)', undefined);
  }

}
