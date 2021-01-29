import { MigrationInterface, QueryRunner } from 'typeorm';

export class overlayMapper1604326861945 implements MigrationInterface {
  name = 'overlayMapper1604326861945';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE TABLE `overlay_mapper` (`id` varchar(36) NOT NULL, `value` varchar(255) NULL, PRIMARY KEY (`id`)) ENGINE=InnoDB');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE `overlay_mapper`');
  }

}
