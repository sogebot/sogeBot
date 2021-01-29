import { MigrationInterface, QueryRunner } from 'typeorm';

export class schemaAlign1578660753048 implements MigrationInterface {
  name = 'schemaAlign1578660753048';

  public async up(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(`ALTER TABLE "user_tip" ALTER COLUMN "message" DROP DEFAULT`, undefined);
    await queryRunner.query(`ALTER TABLE "user_bit" ALTER COLUMN "message" DROP DEFAULT`, undefined);
  }

  public async down(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(`ALTER TABLE "user_bit" ALTER COLUMN "message" SET DEFAULT ''`, undefined);
    await queryRunner.query(`ALTER TABLE "user_tip" ALTER COLUMN "message" SET DEFAULT ''`, undefined);
  }

}
