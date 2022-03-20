import { MigrationInterface, QueryRunner } from 'typeorm';

export class removeBannedEvents1645019207860 implements MigrationInterface {
  name = 'removeBannedEvents1645019207860';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "bannedEvents"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    return;
  }

}
