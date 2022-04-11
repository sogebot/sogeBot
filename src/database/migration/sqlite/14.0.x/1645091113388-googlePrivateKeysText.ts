import { MigrationInterface, QueryRunner } from 'typeorm';

export class googlePrivateKeysText1645091113388 implements MigrationInterface {
  name = 'googlePrivateKeysText1645091113388';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "temporary_google_private_keys" ("id" varchar PRIMARY KEY NOT NULL, "clientEmail" varchar NOT NULL, "privateKey" varchar NOT NULL, "createdAt" varchar NOT NULL)`);
    await queryRunner.query(`INSERT INTO "temporary_google_private_keys"("id", "clientEmail", "privateKey", "createdAt") SELECT "id", "clientEmail", "privateKey", "createdAt" FROM "google_private_keys"`);
    await queryRunner.query(`DROP TABLE "google_private_keys"`);
    await queryRunner.query(`ALTER TABLE "temporary_google_private_keys" RENAME TO "google_private_keys"`);
    await queryRunner.query(`CREATE TABLE "temporary_google_private_keys" ("id" varchar PRIMARY KEY NOT NULL, "clientEmail" varchar NOT NULL, "privateKey" text NOT NULL, "createdAt" varchar NOT NULL)`);
    await queryRunner.query(`INSERT INTO "temporary_google_private_keys"("id", "clientEmail", "privateKey", "createdAt") SELECT "id", "clientEmail", "privateKey", "createdAt" FROM "google_private_keys"`);
    await queryRunner.query(`DROP TABLE "google_private_keys"`);
    await queryRunner.query(`ALTER TABLE "temporary_google_private_keys" RENAME TO "google_private_keys"`);
  }

  public async down() {
    return true;
  }

}
