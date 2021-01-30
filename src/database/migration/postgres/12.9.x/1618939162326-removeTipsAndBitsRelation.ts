import { MigrationInterface, QueryRunner } from 'typeorm';

export class removeTipsAndBitsRelation1618939162326 implements MigrationInterface {
  name = 'removeTipsAndBitsRelation1618939162326';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "user_tip" DROP CONSTRAINT "FK_36683fb221201263b38344a9880"`);
    await queryRunner.query(`ALTER TABLE "user_bit" DROP CONSTRAINT "FK_cca96526faa532e7d20a0f775b0"`);
    await queryRunner.query(`ALTER TABLE "user_tip" RENAME COLUMN "userUserId" TO "userId"`);
    await queryRunner.query(`ALTER TABLE "user_bit" RENAME COLUMN "userUserId" TO "userId"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "user_bit" RENAME COLUMN "userId" TO "userUserId"`);
    await queryRunner.query(`ALTER TABLE "user_tip" RENAME COLUMN "userId" TO "userUserId"`);
    await queryRunner.query(`ALTER TABLE "user_bit" ADD CONSTRAINT "FK_cca96526faa532e7d20a0f775b0" FOREIGN KEY ("userUserId") REFERENCES "user"("userId") ON DELETE CASCADE ON UPDATE CASCADE`);
    await queryRunner.query(`ALTER TABLE "user_tip" ADD CONSTRAINT "FK_36683fb221201263b38344a9880" FOREIGN KEY ("userUserId") REFERENCES "user"("userId") ON DELETE CASCADE ON UPDATE CASCADE`);
  }

}
