import { MigrationInterface, QueryRunner } from 'typeorm';

export class alertSubcommunitygifts1588465569637 implements MigrationInterface {
  name = 'alertSubcommunitygifts1588465569637';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "alert_subcommunitygift" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "alertId" uuid, "enabled" boolean NOT NULL, "title" character varying NOT NULL, "variantCondition" character varying NOT NULL, "variantAmount" integer NOT NULL, "messageTemplate" character varying NOT NULL, "layout" character varying NOT NULL, "animationIn" character varying NOT NULL, "animationOut" character varying NOT NULL, "animationText" character varying NOT NULL, "animationTextOptions" text NOT NULL, "imageId" character varying NOT NULL, "soundId" character varying NOT NULL, "soundVolume" integer NOT NULL, "alertDurationInMs" integer NOT NULL, "alertTextDelayInMs" integer NOT NULL, "enableAdvancedMode" boolean NOT NULL, "advancedMode" text NOT NULL, "tts" text NOT NULL, "font" text NOT NULL, CONSTRAINT "PK_2e0bb8a5b6aa036d00f0a0de2f9" PRIMARY KEY ("id"))`, undefined);
    await queryRunner.query(`ALTER TABLE "alert_subcommunitygift" ADD CONSTRAINT "FK_5cfd9f1ade011e11fd21a2f5bee" FOREIGN KEY ("alertId") REFERENCES "alert"("id") ON DELETE CASCADE ON UPDATE CASCADE`, undefined);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "alert_subcommunitygift" DROP CONSTRAINT "FK_5cfd9f1ade011e11fd21a2f5bee"`, undefined);
    await queryRunner.query(`DROP TABLE "alert_subcommunitygift"`, undefined);
  }

}
