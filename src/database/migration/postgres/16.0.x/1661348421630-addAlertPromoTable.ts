import { MigrationInterface, QueryRunner } from 'typeorm';

export class addAlertPromoTable1661348421630 implements MigrationInterface {
  name = 'addAlertPromoTable1661348421630';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "alert_promo" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "alertId" uuid, "enabled" boolean NOT NULL, "title" character varying NOT NULL, "variantAmount" integer NOT NULL, "messageTemplate" character varying NOT NULL, "ttsTemplate" character varying NOT NULL DEFAULT '', "layout" character varying NOT NULL, "animationIn" character varying NOT NULL, "animationInDuration" integer NOT NULL DEFAULT '2000', "animationOut" character varying NOT NULL, "animationOutDuration" integer NOT NULL DEFAULT '2000', "animationText" character varying NOT NULL, "animationTextOptions" text NOT NULL, "imageId" character varying, "imageOptions" text NOT NULL, "filter" text, "soundId" character varying, "soundVolume" integer NOT NULL, "alertDurationInMs" integer NOT NULL, "alertTextDelayInMs" integer NOT NULL, "enableAdvancedMode" boolean NOT NULL, "advancedMode" text NOT NULL, "tts" text NOT NULL, "font" text, "message" text NOT NULL, CONSTRAINT "PK_32662dd686a472162eb4eee7914" PRIMARY KEY ("id"))`);
    await queryRunner.query(`ALTER TABLE "alert_promo" ADD CONSTRAINT "FK_4e34eee32f20813d614feb05847" FOREIGN KEY ("alertId") REFERENCES "alert"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "alert_promo" DROP CONSTRAINT "FK_4e34eee32f20813d614feb05847"`);
    await queryRunner.query(`DROP TABLE "alert_promo"`);
  }

}
