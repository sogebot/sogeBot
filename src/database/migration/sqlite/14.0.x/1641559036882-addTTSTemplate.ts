import { MigrationInterface, QueryRunner } from 'typeorm';

export class addTTSTemplate1641559036882 implements MigrationInterface {
  name = 'addTTSTemplate1641559036882';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // get all alerts
    const alerts = {} as any;
    for (const type of [
      'tip', 'cheer', 'resub', 'reward_redeem',
    ]) {
      alerts[type]  = await queryRunner.query(`SELECT * FROM "alert_${type}"`);
    }

    await queryRunner.query(`CREATE TABLE "temporary_alert_tip" ("id" varchar PRIMARY KEY NOT NULL, "alertId" varchar, "enabled" boolean NOT NULL, "title" varchar NOT NULL, "filter" text, "variantAmount" integer NOT NULL, "messageTemplate" varchar NOT NULL, "layout" varchar NOT NULL, "animationIn" varchar NOT NULL, "animationOut" varchar NOT NULL, "animationText" varchar NOT NULL, "animationTextOptions" text NOT NULL, "imageId" varchar NOT NULL, "soundId" varchar NOT NULL, "soundVolume" integer NOT NULL, "alertDurationInMs" integer NOT NULL, "alertTextDelayInMs" integer NOT NULL, "enableAdvancedMode" boolean NOT NULL, "advancedMode" text NOT NULL, "tts" text NOT NULL, "font" text, "message" text NOT NULL, "animationInDuration" integer NOT NULL DEFAULT (2000), "animationOutDuration" integer NOT NULL DEFAULT (2000), "imageOptions" text NOT NULL, "ttsTemplate" varchar NOT NULL DEFAULT ('{message}'), CONSTRAINT "FK_05e3dcbf185b77f33cc4078dba2" FOREIGN KEY ("alertId") REFERENCES "alert" ("id") ON DELETE CASCADE ON UPDATE CASCADE)`);
    await queryRunner.query(`INSERT INTO "temporary_alert_tip"("id", "alertId", "enabled", "title", "filter", "variantAmount", "messageTemplate", "layout", "animationIn", "animationOut", "animationText", "animationTextOptions", "imageId", "soundId", "soundVolume", "alertDurationInMs", "alertTextDelayInMs", "enableAdvancedMode", "advancedMode", "tts", "font", "message", "animationInDuration", "animationOutDuration", "imageOptions") SELECT "id", "alertId", "enabled", "title", "filter", "variantAmount", "messageTemplate", "layout", "animationIn", "animationOut", "animationText", "animationTextOptions", "imageId", "soundId", "soundVolume", "alertDurationInMs", "alertTextDelayInMs", "enableAdvancedMode", "advancedMode", "tts", "font", "message", "animationInDuration", "animationOutDuration", "imageOptions" FROM "alert_tip"`);
    await queryRunner.query(`DROP TABLE "alert_tip"`);
    await queryRunner.query(`ALTER TABLE "temporary_alert_tip" RENAME TO "alert_tip"`);
    await queryRunner.query(`CREATE TABLE "temporary_alert_cheer" ("id" varchar PRIMARY KEY NOT NULL, "alertId" varchar, "enabled" boolean NOT NULL, "title" varchar NOT NULL, "filter" text, "variantAmount" integer NOT NULL, "messageTemplate" varchar NOT NULL, "layout" varchar NOT NULL, "animationIn" varchar NOT NULL, "animationOut" varchar NOT NULL, "animationText" varchar NOT NULL, "animationTextOptions" text NOT NULL, "imageId" varchar NOT NULL, "soundId" varchar NOT NULL, "soundVolume" integer NOT NULL, "alertDurationInMs" integer NOT NULL, "alertTextDelayInMs" integer NOT NULL, "enableAdvancedMode" boolean NOT NULL, "advancedMode" text NOT NULL, "tts" text NOT NULL, "font" text, "message" text NOT NULL, "animationInDuration" integer NOT NULL DEFAULT (2000), "animationOutDuration" integer NOT NULL DEFAULT (2000), "imageOptions" text NOT NULL, "ttsTemplate" varchar NOT NULL DEFAULT ('{message}'), CONSTRAINT "FK_09f1fb76339fc4afffc74b37db7" FOREIGN KEY ("alertId") REFERENCES "alert" ("id") ON DELETE CASCADE ON UPDATE CASCADE)`);
    await queryRunner.query(`INSERT INTO "temporary_alert_cheer"("id", "alertId", "enabled", "title", "filter", "variantAmount", "messageTemplate", "layout", "animationIn", "animationOut", "animationText", "animationTextOptions", "imageId", "soundId", "soundVolume", "alertDurationInMs", "alertTextDelayInMs", "enableAdvancedMode", "advancedMode", "tts", "font", "message", "animationInDuration", "animationOutDuration", "imageOptions") SELECT "id", "alertId", "enabled", "title", "filter", "variantAmount", "messageTemplate", "layout", "animationIn", "animationOut", "animationText", "animationTextOptions", "imageId", "soundId", "soundVolume", "alertDurationInMs", "alertTextDelayInMs", "enableAdvancedMode", "advancedMode", "tts", "font", "message", "animationInDuration", "animationOutDuration", "imageOptions" FROM "alert_cheer"`);
    await queryRunner.query(`DROP TABLE "alert_cheer"`);
    await queryRunner.query(`ALTER TABLE "temporary_alert_cheer" RENAME TO "alert_cheer"`);
    await queryRunner.query(`CREATE TABLE "temporary_alert_resub" ("id" varchar PRIMARY KEY NOT NULL, "alertId" varchar, "enabled" boolean NOT NULL, "title" varchar NOT NULL, "filter" text, "variantAmount" integer NOT NULL, "messageTemplate" varchar NOT NULL, "layout" varchar NOT NULL, "animationIn" varchar NOT NULL, "animationOut" varchar NOT NULL, "animationText" varchar NOT NULL, "animationTextOptions" text NOT NULL, "imageId" varchar NOT NULL, "soundId" varchar NOT NULL, "soundVolume" integer NOT NULL, "alertDurationInMs" integer NOT NULL, "alertTextDelayInMs" integer NOT NULL, "enableAdvancedMode" boolean NOT NULL, "advancedMode" text NOT NULL, "tts" text NOT NULL, "font" text, "message" text NOT NULL, "animationInDuration" integer NOT NULL DEFAULT (2000), "animationOutDuration" integer NOT NULL DEFAULT (2000), "imageOptions" text NOT NULL, "ttsTemplate" varchar NOT NULL DEFAULT ('{message}'), CONSTRAINT "FK_25ce77691f1aa94d954c0f88ecd" FOREIGN KEY ("alertId") REFERENCES "alert" ("id") ON DELETE CASCADE ON UPDATE CASCADE)`);
    await queryRunner.query(`INSERT INTO "temporary_alert_resub"("id", "alertId", "enabled", "title", "filter", "variantAmount", "messageTemplate", "layout", "animationIn", "animationOut", "animationText", "animationTextOptions", "imageId", "soundId", "soundVolume", "alertDurationInMs", "alertTextDelayInMs", "enableAdvancedMode", "advancedMode", "tts", "font", "message", "animationInDuration", "animationOutDuration", "imageOptions") SELECT "id", "alertId", "enabled", "title", "filter", "variantAmount", "messageTemplate", "layout", "animationIn", "animationOut", "animationText", "animationTextOptions", "imageId", "soundId", "soundVolume", "alertDurationInMs", "alertTextDelayInMs", "enableAdvancedMode", "advancedMode", "tts", "font", "message", "animationInDuration", "animationOutDuration", "imageOptions" FROM "alert_resub"`);
    await queryRunner.query(`DROP TABLE "alert_resub"`);
    await queryRunner.query(`ALTER TABLE "temporary_alert_resub" RENAME TO "alert_resub"`);
    await queryRunner.query(`CREATE TABLE "temporary_alert_reward_redeem" ("id" varchar PRIMARY KEY NOT NULL, "alertId" varchar, "enabled" boolean NOT NULL, "title" varchar NOT NULL, "filter" text, "variantAmount" integer NOT NULL, "messageTemplate" varchar NOT NULL, "layout" varchar NOT NULL, "animationIn" varchar NOT NULL, "animationInDuration" integer NOT NULL DEFAULT (2000), "animationOut" varchar NOT NULL, "animationOutDuration" integer NOT NULL DEFAULT (2000), "animationText" varchar NOT NULL, "animationTextOptions" text NOT NULL, "imageId" varchar NOT NULL, "soundId" varchar NOT NULL, "soundVolume" integer NOT NULL, "alertDurationInMs" integer NOT NULL, "alertTextDelayInMs" integer NOT NULL, "enableAdvancedMode" boolean NOT NULL, "advancedMode" text NOT NULL, "tts" text NOT NULL, "font" text, "message" text NOT NULL, "rewardId" varchar NOT NULL, "imageOptions" text NOT NULL, "ttsTemplate" varchar NOT NULL DEFAULT ('{message}'), CONSTRAINT "FK_c55befc36aa21345e5f27513eb3" FOREIGN KEY ("alertId") REFERENCES "alert" ("id") ON DELETE CASCADE ON UPDATE CASCADE)`);
    await queryRunner.query(`INSERT INTO "temporary_alert_reward_redeem"("id", "alertId", "enabled", "title", "filter", "variantAmount", "messageTemplate", "layout", "animationIn", "animationInDuration", "animationOut", "animationOutDuration", "animationText", "animationTextOptions", "imageId", "soundId", "soundVolume", "alertDurationInMs", "alertTextDelayInMs", "enableAdvancedMode", "advancedMode", "tts", "font", "message", "rewardId", "imageOptions") SELECT "id", "alertId", "enabled", "title", "filter", "variantAmount", "messageTemplate", "layout", "animationIn", "animationInDuration", "animationOut", "animationOutDuration", "animationText", "animationTextOptions", "imageId", "soundId", "soundVolume", "alertDurationInMs", "alertTextDelayInMs", "enableAdvancedMode", "advancedMode", "tts", "font", "message", "rewardId", "imageOptions" FROM "alert_reward_redeem"`);
    await queryRunner.query(`DROP TABLE "alert_reward_redeem"`);
    await queryRunner.query(`ALTER TABLE "temporary_alert_reward_redeem" RENAME TO "alert_reward_redeem"`);

    // resave all alerts
    for (const type of [ 'tip', 'cheer', 'resub', 'reward_redeem' ]) {
      await queryRunner.query(`DELETE FROM "alert_${type}" WHERE 1=1`);
      for (const item of alerts[type]) {
        const keys = Object.keys(item);
        await queryRunner.query(`INSERT INTO "alert_${type}" (${keys.map(o => `${o}`).join(', ')}) values (${keys.map(o => `?`).join(', ')})`,
          keys.map(o => item[o]));
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    return;
  }

}
