import {MigrationInterface, QueryRunner} from 'typeorm';

export class alertSubcommunitygifts1588461550826 implements MigrationInterface {
  name = 'alertSubcommunitygifts1588461550826';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "alert_subgift" RENAME TO "alert_subcommunitygift"`, undefined);
    await queryRunner.query(`CREATE TABLE "alert_subgift" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "alertId" uuid, "enabled" boolean NOT NULL, "title" character varying NOT NULL, "variantCondition" character varying NOT NULL, "variantAmount" integer NOT NULL, "messageTemplate" character varying NOT NULL, "layout" character varying NOT NULL, "animationIn" character varying NOT NULL, "animationOut" character varying NOT NULL, "animationText" character varying NOT NULL, "animationTextOptions" text NOT NULL, "imageId" character varying NOT NULL, "soundId" character varying NOT NULL, "soundVolume" integer NOT NULL, "alertDurationInMs" integer NOT NULL, "alertTextDelayInMs" integer NOT NULL, "enableAdvancedMode" boolean NOT NULL, "advancedMode" text NOT NULL, "tts" text NOT NULL, "font" text NOT NULL, CONSTRAINT "PK_85b3a2a8d2d5d0695f280ea0eee" PRIMARY KEY ("id"))`, undefined);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "alert_subgift"`, undefined);
    await queryRunner.query(`ALTER TABLE "alert_subcommunitygift" RENAME TO "alert_subgift"`, undefined);
  }

}
