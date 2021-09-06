import { MigrationInterface, QueryRunner } from 'typeorm';

export class addAlertParries1630924716945 implements MigrationInterface {
  name = 'addAlertParries1630924716945';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // get all alerts
    const alerts = {} as any;
    for (const type of [
      'follow', 'sub', 'subcommunitygift',
      'subgift', 'host', 'raid', 'tip', 'cheer',
      'resub', 'command_redeem', 'reward_redeem',
    ]) {
      alerts[type]  = await queryRunner.query(`SELECT * FROM alert_${type}`);
    }
    alerts.global = await queryRunner.query('SELECT * FROM alert');

    await queryRunner.query(`DROP TABLE "alert"`);
    await queryRunner.query(`CREATE TABLE "alert" ("id" varchar PRIMARY KEY NOT NULL, "updatedAt" bigint NOT NULL DEFAULT (0), "name" varchar NOT NULL, "alertDelayInMs" integer NOT NULL, "profanityFilterType" varchar NOT NULL, "loadStandardProfanityList" text NOT NULL, "customProfanityList" text NOT NULL, "tts" text, "font" text NOT NULL, "fontMessage" text NOT NULL, "parry" text NOT NULL)`);

    for (const alert of alerts.global) {
      alert.loadStandardProfanityList = JSON.parse(alert.loadStandardProfanityList) as any;
      alert.tts = JSON.parse(alert.tts) as any;
      alert.fontMessage = JSON.parse(alert.fontMessage) as any;
      alert.font = JSON.parse(alert.font) as any;

      await queryRunner.manager.getRepository(`alert`).insert({
        ...alert,
        parry: {
          enabled: false,
          delay:   0,
        },
      });
    }

    // resave all alerts
    for (const type of [
      'follow', 'sub', 'subcommunitygift',
      'subgift', 'host', 'raid', 'tip', 'cheer',
      'resub', 'command_redeem', 'reward_redeem',
    ]) {
      await queryRunner.manager.getRepository(`alert_${type}`).clear();
      for (const alert of alerts[type]) {
        alert.animationTextOptions = JSON.parse(alert.animationTextOptions) as any;
        alert.imageOptions = JSON.parse(alert.imageOptions) as any;
        alert.advancedMode = JSON.parse(alert.advancedMode) as any;
        alert.tts = JSON.parse(alert.tts) as any;
        alert.font = JSON.parse(alert.font) as any;
        if (['tip', 'cheer', 'resub', 'reward_redeem'].includes(type)) {
          alert.message = JSON.parse(alert.message) as any;
        }
        await queryRunner.manager.getRepository(`alert_${type}`).insert(alert);
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // get all alerts
    const alerts = {} as any;
    for (const type of [
      'follow', 'sub', 'subcommunitygift',
      'subgift', 'host', 'raid', 'tip', 'cheer',
      'resub', 'command_redeem', 'reward_redeem',
    ]) {
      alerts[type]  = await queryRunner.query(`SELECT * FROM alert_${type}`);
    }
    alerts.global = await queryRunner.query('SELECT * FROM alert');

    await queryRunner.query(`DROP TABLE "alert"`);
    await queryRunner.query(`CREATE TABLE "alert" ("id" varchar PRIMARY KEY NOT NULL, "updatedAt" bigint NOT NULL DEFAULT (0), "name" varchar NOT NULL, "alertDelayInMs" integer NOT NULL, "profanityFilterType" varchar NOT NULL, "loadStandardProfanityList" text NOT NULL, "customProfanityList" text NOT NULL, "tts" text, "font" text NOT NULL, "fontMessage" text NOT NULL)`);

    for (const alert of alerts.global) {
      delete alert.parry;
      alert.loadStandardProfanityList = JSON.parse(alert.loadStandardProfanityList) as any;
      alert.tts = JSON.parse(alert.tts) as any;
      alert.fontMessage = JSON.parse(alert.fontMessage) as any;
      alert.font = JSON.parse(alert.font) as any;
      await queryRunner.manager.getRepository(`alert`).insert({ ...alert });
    }

    // resave all alerts
    for (const type of [
      'follow', 'sub', 'subcommunitygift',
      'subgift', 'host', 'raid', 'tip', 'cheer',
      'resub', 'command_redeem', 'reward_redeem',
    ]) {
      await queryRunner.manager.getRepository(`alert_${type}`).clear();
      for (const alert of alerts[type]) {
        alert.animationTextOptions = JSON.parse(alert.animationTextOptions) as any;
        alert.imageOptions = JSON.parse(alert.imageOptions) as any;
        alert.advancedMode = JSON.parse(alert.advancedMode) as any;
        alert.tts = JSON.parse(alert.tts) as any;
        alert.font = JSON.parse(alert.font) as any;
        if (['tip', 'cheer', 'resub', 'reward_redeem'].includes(type)) {
          alert.message = JSON.parse(alert.message) as any;
        }
        await queryRunner.manager.getRepository(`alert_${type}`).insert(alert);
      }
    }
  }

}
