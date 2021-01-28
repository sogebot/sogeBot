import { MigrationInterface, QueryRunner } from 'typeorm';

export class commandResponsesResponseToText1576758423496 implements MigrationInterface {
  name = 'commandResponsesResponseToText1576758423496';

  public async up(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query('ALTER TABLE `commands_responses` MODIFY COLUMN `response` text', undefined);
  }

  public async down(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query('ALTER TABLE `commands_responses` MODIFY COLUMN `response` varchar(255)', undefined);
  }

}
