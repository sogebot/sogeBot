import { MigrationInterface, QueryRunner } from 'typeorm';

export class initialize1000000000001 implements MigrationInterface {
  name = 'initialize1000000000001';

  public async up(queryRunner: QueryRunner): Promise<any> {
    return;
  }

  public async down(queryRunner: QueryRunner): Promise<any> {
    return;
  }

}
