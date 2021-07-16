import { MigrationInterface, QueryRunner } from 'typeorm';

export class priceBits1601537943813 implements MigrationInterface {
  name = 'priceBits1601537943813';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_d12db23d28020784096bcb41a3"`);
    await queryRunner.query(`CREATE TABLE "temporary_price" ("id" varchar PRIMARY KEY NOT NULL, "command" varchar NOT NULL, "enabled" boolean NOT NULL DEFAULT (1), "price" integer NOT NULL, "emitRedeemEvent" boolean NOT NULL DEFAULT (0), "priceBits" integer NOT NULL DEFAULT (0))`);
    await queryRunner.query(`INSERT INTO "temporary_price"("id", "command", "enabled", "price") SELECT "id", "command", "enabled", "price" FROM "price"`);
    await queryRunner.query(`DROP TABLE "price"`);
    await queryRunner.query(`ALTER TABLE "temporary_price" RENAME TO "price"`);
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_d12db23d28020784096bcb41a3" ON "price" ("command") `);
    await queryRunner.query(`CREATE TABLE "alert_command_redeem" ("id" varchar PRIMARY KEY NOT NULL, "alertId" varchar, "enabled" boolean NOT NULL, "title" varchar NOT NULL, "variantCondition" varchar NOT NULL, "variantAmount" integer NOT NULL, "messageTemplate" varchar NOT NULL, "layout" varchar NOT NULL, "animationIn" varchar NOT NULL, "animationInDuration" integer NOT NULL DEFAULT (2000), "animationOut" varchar NOT NULL, "animationOutDuration" integer NOT NULL DEFAULT (2000), "animationText" varchar NOT NULL, "animationTextOptions" text NOT NULL, "imageId" varchar NOT NULL, "soundId" varchar NOT NULL, "soundVolume" integer NOT NULL, "alertDurationInMs" integer NOT NULL, "alertTextDelayInMs" integer NOT NULL, "enableAdvancedMode" boolean NOT NULL, "advancedMode" text NOT NULL, "tts" text NOT NULL, "font" text NOT NULL)`);
    await queryRunner.query(`CREATE TABLE "temporary_alert_command_redeem" ("id" varchar PRIMARY KEY NOT NULL, "alertId" varchar, "enabled" boolean NOT NULL, "title" varchar NOT NULL, "variantCondition" varchar NOT NULL, "variantAmount" integer NOT NULL, "messageTemplate" varchar NOT NULL, "layout" varchar NOT NULL, "animationIn" varchar NOT NULL, "animationInDuration" integer NOT NULL DEFAULT (2000), "animationOut" varchar NOT NULL, "animationOutDuration" integer NOT NULL DEFAULT (2000), "animationText" varchar NOT NULL, "animationTextOptions" text NOT NULL, "imageId" varchar NOT NULL, "soundId" varchar NOT NULL, "soundVolume" integer NOT NULL, "alertDurationInMs" integer NOT NULL, "alertTextDelayInMs" integer NOT NULL, "enableAdvancedMode" boolean NOT NULL, "advancedMode" text NOT NULL, "tts" text NOT NULL, "font" text NOT NULL, CONSTRAINT "FK_d118fd8e1d7f331372e95b7e235" FOREIGN KEY ("alertId") REFERENCES "alert" ("id") ON DELETE CASCADE ON UPDATE CASCADE)`);
    await queryRunner.query(`INSERT INTO "temporary_alert_command_redeem"("id", "alertId", "enabled", "title", "variantCondition", "variantAmount", "messageTemplate", "layout", "animationIn", "animationInDuration", "animationOut", "animationOutDuration", "animationText", "animationTextOptions", "imageId", "soundId", "soundVolume", "alertDurationInMs", "alertTextDelayInMs", "enableAdvancedMode", "advancedMode", "tts", "font") SELECT "id", "alertId", "enabled", "title", "variantCondition", "variantAmount", "messageTemplate", "layout", "animationIn", "animationInDuration", "animationOut", "animationOutDuration", "animationText", "animationTextOptions", "imageId", "soundId", "soundVolume", "alertDurationInMs", "alertTextDelayInMs", "enableAdvancedMode", "advancedMode", "tts", "font" FROM "alert_command_redeem"`);
    await queryRunner.query(`DROP TABLE "alert_command_redeem"`);
    await queryRunner.query(`ALTER TABLE "temporary_alert_command_redeem" RENAME TO "alert_command_redeem"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_d12db23d28020784096bcb41a3"`);
    await queryRunner.query(`ALTER TABLE "price" RENAME TO "temporary_price"`);
    await queryRunner.query(`CREATE TABLE "price" ("id" varchar PRIMARY KEY NOT NULL, "command" varchar NOT NULL, "enabled" boolean NOT NULL DEFAULT (1), "price" integer NOT NULL)`);
    await queryRunner.query(`INSERT INTO "price"("id", "command", "enabled", "price") SELECT "id", "command", "enabled", "price" FROM "temporary_price"`);
    await queryRunner.query(`DROP TABLE "temporary_price"`);
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_d12db23d28020784096bcb41a3" ON "price" ("command") `);
    await queryRunner.query(`ALTER TABLE "alert_command_redeem" RENAME TO "temporary_alert_command_redeem"`);
    await queryRunner.query(`CREATE TABLE "alert_command_redeem" ("id" varchar PRIMARY KEY NOT NULL, "alertId" varchar, "enabled" boolean NOT NULL, "title" varchar NOT NULL, "variantCondition" varchar NOT NULL, "variantAmount" integer NOT NULL, "messageTemplate" varchar NOT NULL, "layout" varchar NOT NULL, "animationIn" varchar NOT NULL, "animationInDuration" integer NOT NULL DEFAULT (2000), "animationOut" varchar NOT NULL, "animationOutDuration" integer NOT NULL DEFAULT (2000), "animationText" varchar NOT NULL, "animationTextOptions" text NOT NULL, "imageId" varchar NOT NULL, "soundId" varchar NOT NULL, "soundVolume" integer NOT NULL, "alertDurationInMs" integer NOT NULL, "alertTextDelayInMs" integer NOT NULL, "enableAdvancedMode" boolean NOT NULL, "advancedMode" text NOT NULL, "tts" text NOT NULL, "font" text NOT NULL)`);
    await queryRunner.query(`INSERT INTO "alert_command_redeem"("id", "alertId", "enabled", "title", "variantCondition", "variantAmount", "messageTemplate", "layout", "animationIn", "animationInDuration", "animationOut", "animationOutDuration", "animationText", "animationTextOptions", "imageId", "soundId", "soundVolume", "alertDurationInMs", "alertTextDelayInMs", "enableAdvancedMode", "advancedMode", "tts", "font") SELECT "id", "alertId", "enabled", "title", "variantCondition", "variantAmount", "messageTemplate", "layout", "animationIn", "animationInDuration", "animationOut", "animationOutDuration", "animationText", "animationTextOptions", "imageId", "soundId", "soundVolume", "alertDurationInMs", "alertTextDelayInMs", "enableAdvancedMode", "advancedMode", "tts", "font" FROM "temporary_alert_command_redeem"`);
    await queryRunner.query(`DROP TABLE "temporary_alert_command_redeem"`);
    await queryRunner.query(`DROP TABLE "alert_command_redeem"`);
  }

}
