import { MigrationInterface, QueryRunner } from 'typeorm';

export class customvariableNullFix1573908738002 implements MigrationInterface {
  name = 'customvariableNullFix1573908738002';

  public async up(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query('ALTER TABLE `variable` MODIFY `currentValue` varchar(255)', undefined);
  }

  public async down(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query('ALTER TABLE `variable` MODIFY `currentValue` varchar(255) NOT NULL', undefined);
  }
}
