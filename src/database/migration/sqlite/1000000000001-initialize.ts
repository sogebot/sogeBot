import { MigrationInterface, QueryRunner } from 'typeorm';

export class initialize1000000000001 implements MigrationInterface {
  transaction?: boolean | undefined;
  name = 'initialize1000000000001';

  public async up(queryRunner: QueryRunner): Promise<any> {
    const migrations = await queryRunner.query(`SELECT * FROM "migrations"`);
    if (migrations.length > 0) {
      console.log('Skipping migration zero, migrations are already in bot');
    }
  }

  public async down(queryRunner: QueryRunner): Promise<any> {
    return;
  }

}