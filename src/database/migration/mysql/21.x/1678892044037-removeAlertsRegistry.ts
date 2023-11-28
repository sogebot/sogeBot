import { MigrationInterface, QueryRunner } from 'typeorm';

export class removeAlertsRegistry1678892044037 implements MigrationInterface {
  name = 'removeAlertsRegistry1678892044037';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE \`alert\``);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    return;
  }

}
