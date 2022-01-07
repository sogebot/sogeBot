import { MigrationInterface, QueryRunner } from 'typeorm';

export class globalTTSForAlerts1613659461852 implements MigrationInterface {
  name = 'globalTTSForAlerts1613659461852';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // get all alerts
    const alerts = {} as any;
    for (const type of [
      'follow', 'sub', 'subcommunitygift',
      'subgift', 'host', 'raid', 'tip', 'cheer',
      'resub', 'command_redeem', 'reward_redeem',
    ]) {
      alerts[type]  = await queryRunner.query(`SELECT * FROM "alert_${type}"`);
    }
    await queryRunner.query(`CREATE TABLE "temporary_alert" ("id" varchar PRIMARY KEY NOT NULL, "updatedAt" bigint NOT NULL DEFAULT (0), "name" varchar NOT NULL, "alertDelayInMs" integer NOT NULL, "profanityFilterType" varchar NOT NULL, "loadStandardProfanityList" text NOT NULL, "customProfanityList" text NOT NULL, "tts" text)`);
    await queryRunner.query(`INSERT INTO "temporary_alert"("id", "updatedAt", "name", "alertDelayInMs", "profanityFilterType", "loadStandardProfanityList", "customProfanityList") SELECT "id", "updatedAt", "name", "alertDelayInMs", "profanityFilterType", "loadStandardProfanityList", "customProfanityList" FROM "alert"`);
    await queryRunner.query(`DROP TABLE "alert"`);
    await queryRunner.query(`ALTER TABLE "temporary_alert" RENAME TO "alert"`);

    // resave all alerts
    for (const type of [
      'follow', 'sub', 'subcommunitygift',
      'subgift', 'host', 'raid', 'tip', 'cheer',
      'resub', 'command_redeem', 'reward_redeem',
    ]) {
      await queryRunner.query(`DELETE FROM "alert_${type}" WHERE 1=1`);
      for (const item of alerts[type]) {
        const keys = Object.keys(item);
        await queryRunner.query(`INSERT INTO "alert_${type}" (${keys.map(o => `${o}`).join(', ')}) values (${keys.map(o => `?`).join(', ')})`,
          keys.map(o => item[o]));
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
      alerts[type]  = await queryRunner.query(`SELECT * FROM "alert_${type}"`);
    }

    await queryRunner.query(`ALTER TABLE "alert" RENAME TO "temporary_alert"`);
    await queryRunner.query(`CREATE TABLE "alert" ("id" varchar PRIMARY KEY NOT NULL, "updatedAt" bigint NOT NULL DEFAULT (0), "name" varchar NOT NULL, "alertDelayInMs" integer NOT NULL, "profanityFilterType" varchar NOT NULL, "loadStandardProfanityList" text NOT NULL, "customProfanityList" text NOT NULL)`);
    await queryRunner.query(`INSERT INTO "alert"("id", "updatedAt", "name", "alertDelayInMs", "profanityFilterType", "loadStandardProfanityList", "customProfanityList") SELECT "id", "updatedAt", "name", "alertDelayInMs", "profanityFilterType", "loadStandardProfanityList", "customProfanityList" FROM "temporary_alert"`);
    await queryRunner.query(`DROP TABLE "temporary_alert"`);

    // resave all alerts
    for (const type of [
      'follow', 'sub', 'subcommunitygift',
      'subgift', 'host', 'raid', 'tip', 'cheer',
      'resub', 'command_redeem', 'reward_redeem',
    ]) {
      await queryRunner.query(`DELETE FROM "alert_${type}" WHERE 1=1`);
      for (const item of alerts[type]) {
        const keys = Object.keys(item);
        await queryRunner.query(`INSERT INTO "alert_${type}" (${keys.map(o => `${o}`).join(', ')}) values (${keys.map(o => `?`).join(', ')})`,
          keys.map(o => item[o]));
      }
    }
  }

}
