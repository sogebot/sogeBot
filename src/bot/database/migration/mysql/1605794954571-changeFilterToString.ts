import { MigrationInterface, QueryRunner } from 'typeorm';

export class changeFilterToString1605794954571 implements MigrationInterface {
  name = 'changeFilterToString1605794954571';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE `permission_filters` CHANGE `value` `value` varchar(255) NOT NULL');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE `permission_filters` CHANGE `value` `value` bigint NOT NULL');
  }
}
