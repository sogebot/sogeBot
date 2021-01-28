import { MigrationInterface, QueryRunner } from 'typeorm';

export class alertSubcommunitygifts1588461550826 implements MigrationInterface {
  name = 'alertSubcommunitygifts1588461550826';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "alert_subgift" RENAME TO "alert_subcommunitygift"`, undefined);
    await queryRunner.query(`CREATE TABLE "alert_subgift" ("id" varchar PRIMARY KEY NOT NULL, "alertId" varchar, "enabled" boolean NOT NULL, "title" varchar NOT NULL, "variantCondition" varchar NOT NULL, "variantAmount" integer NOT NULL, "messageTemplate" varchar NOT NULL, "layout" varchar NOT NULL, "animationIn" varchar NOT NULL, "animationOut" varchar NOT NULL, "animationText" varchar NOT NULL, "animationTextOptions" text NOT NULL, "imageId" varchar NOT NULL, "soundId" varchar NOT NULL, "soundVolume" integer NOT NULL, "alertDurationInMs" integer NOT NULL, "alertTextDelayInMs" integer NOT NULL, "enableAdvancedMode" boolean NOT NULL, "advancedMode" text NOT NULL, "tts" text NOT NULL, "font" text NOT NULL, CONSTRAINT "FK_5cfd9f1ade011e11fd21a2f5bcc" FOREIGN KEY ("alertId") REFERENCES "alert" ("id") ON DELETE CASCADE ON UPDATE CASCADE)`, undefined);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "alert_subgift"`, undefined);
    await queryRunner.query(`ALTER TABLE "alert_subcommunitygift" RENAME TO "alert_subgift"`, undefined);
  }

}
