import { MigrationInterface, QueryRunner } from 'typeorm';

export class updateRandomizer1666167883938 implements MigrationInterface {
  name = 'updateRandomizer1666167883938';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "randomizer_items"`);
    await queryRunner.query(`DROP TABLE "randomizer"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    return;
  }

}
