import { MigrationInterface, QueryRunner } from 'typeorm';

export class globalTTSForAlerts1613659461852 implements MigrationInterface {
  name = 'globalTTSForAlerts1613659461852';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "temporary_alert" ("id" varchar PRIMARY KEY NOT NULL, "updatedAt" bigint NOT NULL DEFAULT (0), "name" varchar NOT NULL, "alertDelayInMs" integer NOT NULL, "profanityFilterType" varchar NOT NULL, "loadStandardProfanityList" text NOT NULL, "customProfanityList" text NOT NULL, "tts" text)`);
    await queryRunner.query(`INSERT INTO "temporary_alert"("id", "updatedAt", "name", "alertDelayInMs", "profanityFilterType", "loadStandardProfanityList", "customProfanityList") SELECT "id", "updatedAt", "name", "alertDelayInMs", "profanityFilterType", "loadStandardProfanityList", "customProfanityList" FROM "alert"`);
    await queryRunner.query(`DROP TABLE "alert"`);
    await queryRunner.query(`ALTER TABLE "temporary_alert" RENAME TO "alert"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    return;
  }

}
