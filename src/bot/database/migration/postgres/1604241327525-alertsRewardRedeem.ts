import { MigrationInterface, QueryRunner } from 'typeorm';

export class alertsRewardRedeem1604241327525 implements MigrationInterface {
  name = 'alertsRewardRedeem1604241327525';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "alert_reward_redeem" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "alertId" uuid, "enabled" boolean NOT NULL, "title" character varying NOT NULL, "variantCondition" character varying NOT NULL, "variantAmount" integer NOT NULL, "messageTemplate" character varying NOT NULL, "layout" character varying NOT NULL, "animationIn" character varying NOT NULL, "animationInDuration" integer NOT NULL DEFAULT 2000, "animationOut" character varying NOT NULL, "animationOutDuration" integer NOT NULL DEFAULT 2000, "animationText" character varying NOT NULL, "animationTextOptions" text NOT NULL, "imageId" character varying NOT NULL, "soundId" character varying NOT NULL, "soundVolume" integer NOT NULL, "alertDurationInMs" integer NOT NULL, "alertTextDelayInMs" integer NOT NULL, "enableAdvancedMode" boolean NOT NULL, "advancedMode" text NOT NULL, "tts" text NOT NULL, "font" text NOT NULL, "message" text NOT NULL, "rewardId" character varying NOT NULL, CONSTRAINT "PK_61f08d4a7e5dfcfb31080117297" PRIMARY KEY ("id"))`);
    await queryRunner.query(`ALTER TABLE "alert_reward_redeem" ADD CONSTRAINT "FK_c55befc36aa21345e5f27513eb3" FOREIGN KEY ("alertId") REFERENCES "alert"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "alert_reward_redeem" DROP CONSTRAINT "FK_c55befc36aa21345e5f27513eb3"`);
    await queryRunner.query(`DROP TABLE "alert_reward_redeem"`);
  }

}
