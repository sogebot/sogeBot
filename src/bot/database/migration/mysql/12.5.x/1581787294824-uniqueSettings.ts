import { MigrationInterface, QueryRunner } from 'typeorm';

export class uniqueSettings1581787294824 implements MigrationInterface {
  name = 'uniqueSettings1581787294824';

  public async up(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query('DROP INDEX `IDX_d8a83b9ffce680092c8dfee37d` ON `settings`', undefined);
    await queryRunner.query('DROP INDEX `IDX_ca7857276d2a30f4dcfa0e42cd` ON `settings`', undefined);
    await queryRunner.query('CREATE UNIQUE INDEX `IDX_d8a83b9ffce680092c8dfee37d` ON `settings` (`namespace`, `name`)', undefined);
  }

  public async down(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query('DROP INDEX `IDX_d8a83b9ffce680092c8dfee37d` ON `settings`', undefined);
    await queryRunner.query('CREATE INDEX `IDX_ca7857276d2a30f4dcfa0e42cd` ON `settings` (`name`)', undefined);
    await queryRunner.query('CREATE INDEX `IDX_d8a83b9ffce680092c8dfee37d` ON `settings` (`namespace`)', undefined);
  }

}
