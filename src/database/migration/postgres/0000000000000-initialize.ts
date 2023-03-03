import { MigrationInterface, QueryRunner } from 'typeorm';

export class initialize0000000000000 implements MigrationInterface {
  name = 'initialize0000000000000';

  public async up(queryRunner: QueryRunner): Promise<any> {
    return;
  }

  public async down(queryRunner: QueryRunner): Promise<any> {
    return;
  }

}
