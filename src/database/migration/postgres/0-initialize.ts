import { MigrationInterface, QueryRunner } from 'typeorm';

export class initialize0 implements MigrationInterface {
  name = 'initialize0';

  public async up(queryRunner: QueryRunner): Promise<any> {
    return;
  }

  public async down(queryRunner: QueryRunner): Promise<any> {
    return;
  }

}
