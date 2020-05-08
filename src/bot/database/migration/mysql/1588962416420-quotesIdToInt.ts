import {MigrationInterface, QueryRunner} from 'typeorm';

export class quotesIdToInt1588962416420 implements MigrationInterface {
  name = 'quotesIdToInt1588962416420';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE `quotes` MODIFY `id` INT(10) UNSIGNED AUTOINCREMENT;', undefined);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE `quotes` MODIFY `id` INT(10) UNSIGNED AUTOINCREMENT;', undefined);
  }

}
