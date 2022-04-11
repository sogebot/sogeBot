import { MigrationInterface, QueryRunner } from 'typeorm';

export class googlePrivateKeysText1645091113388 implements MigrationInterface {
  name = 'googlePrivateKeysText1645091113388';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "google_private_keys" ALTER COLUMN "privateKey" SET DATA TYPE text`);
  }

  public async down() {
    return true;
  }

}
