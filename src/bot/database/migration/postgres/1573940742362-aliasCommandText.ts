import {MigrationInterface, QueryRunner} from 'typeorm';

export class aliasCommandText1573940742362 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query('ALTER TABLE "alias" ALTER COLUMN "command" SET DATA TYPE text', undefined);
  }

  public async down(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(`ALTER TABLE "alias" ALTER COLUMN "command" SET DATA TYPE character varying`, undefined);
  }

}
