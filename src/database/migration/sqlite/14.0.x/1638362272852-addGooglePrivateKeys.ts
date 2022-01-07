import { MigrationInterface, QueryRunner } from 'typeorm';

export class addGooglePrivateKeys1638362272852 implements MigrationInterface {
  name = 'addGooglePrivateKeys1638362272852';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "google_private_keys" ("id" varchar PRIMARY KEY NOT NULL, "clientEmail" varchar NOT NULL, "privateKey" varchar NOT NULL, "createdAt" varchar NOT NULL)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "google_private_keys"`);
  }

}
