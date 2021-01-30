import { MigrationInterface, QueryRunner } from 'typeorm';

export class twitchStatsRemoveHosts1613554160927 implements MigrationInterface {
  name = 'twitchStatsRemoveHosts1613554160927';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "temporary_twitch_stats" ("whenOnline" bigint PRIMARY KEY NOT NULL, "currentViewers" integer NOT NULL DEFAULT (0), "currentSubscribers" integer NOT NULL DEFAULT (0), "currentBits" bigint NOT NULL, "currentTips" float NOT NULL, "chatMessages" bigint NOT NULL, "currentFollowers" integer NOT NULL DEFAULT (0), "currentViews" integer NOT NULL DEFAULT (0), "maxViewers" integer NOT NULL DEFAULT (0), "newChatters" integer NOT NULL DEFAULT (0), "currentWatched" bigint NOT NULL)`);
    await queryRunner.query(`INSERT INTO "temporary_twitch_stats"("whenOnline", "currentViewers", "currentSubscribers", "currentBits", "currentTips", "chatMessages", "currentFollowers", "currentViews", "maxViewers", "newChatters", "currentWatched") SELECT "whenOnline", "currentViewers", "currentSubscribers", "currentBits", "currentTips", "chatMessages", "currentFollowers", "currentViews", "maxViewers", "newChatters", "currentWatched" FROM "twitch_stats"`);
    await queryRunner.query(`DROP TABLE "twitch_stats"`);
    await queryRunner.query(`ALTER TABLE "temporary_twitch_stats" RENAME TO "twitch_stats"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "twitch_stats" RENAME TO "temporary_twitch_stats"`);
    await queryRunner.query(`CREATE TABLE "twitch_stats" ("whenOnline" bigint PRIMARY KEY NOT NULL, "currentViewers" integer NOT NULL DEFAULT (0), "currentSubscribers" integer NOT NULL DEFAULT (0), "currentBits" bigint NOT NULL, "currentTips" float NOT NULL, "chatMessages" bigint NOT NULL, "currentFollowers" integer NOT NULL DEFAULT (0), "currentViews" integer NOT NULL DEFAULT (0), "maxViewers" integer NOT NULL DEFAULT (0), "currentHosts" integer NOT NULL DEFAULT (0), "newChatters" integer NOT NULL DEFAULT (0), "currentWatched" bigint NOT NULL)`);
    await queryRunner.query(`INSERT INTO "twitch_stats"("whenOnline", "currentViewers", "currentSubscribers", "currentBits", "currentTips", "chatMessages", "currentFollowers", "currentViews", "maxViewers", "newChatters", "currentWatched") SELECT "whenOnline", "currentViewers", "currentSubscribers", "currentBits", "currentTips", "chatMessages", "currentFollowers", "currentViews", "maxViewers", "newChatters", "currentWatched" FROM "temporary_twitch_stats"`);
    await queryRunner.query(`DROP TABLE "temporary_twitch_stats"`);
  }

}