import { MigrationInterface, QueryRunner } from 'typeorm';

export class addGooglePrivateKeys1638362272852 implements MigrationInterface {
  name = 'addGooglePrivateKeys1638362272852';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "google_private_keys" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "clientEmail" character varying NOT NULL, "privateKey" character varying NOT NULL, "createdAt" character varying NOT NULL, CONSTRAINT "PK_dd2e74a8b7a602b6b4a1f1e1816" PRIMARY KEY ("id"))`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "google_private_keys"`);
  }

}
