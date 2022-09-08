import { MigrationInterface, QueryRunner } from 'typeorm';

export class removeHostsTables1662119547478 implements MigrationInterface {
  name = 'removeHostsTables1662119547478';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE \`alert_host\``);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    return;
  }

}