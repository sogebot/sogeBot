import { MigrationInterface, QueryRunner } from 'typeorm';

export class addIndexes1634053219262 implements MigrationInterface {
  name = 'addIndexes1634053219262';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE INDEX "IDX_user_tip_userId" ON "user_tip" ("userId") `);
    await queryRunner.query(`CREATE INDEX "IDX_user_bit_userId" ON "user_bit" ("userId") `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_user_bit_userId"`);
    await queryRunner.query(`DROP INDEX "IDX_user_tip_userId"`);
  }

}