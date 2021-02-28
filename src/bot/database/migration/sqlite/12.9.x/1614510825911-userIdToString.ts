import { chunk } from 'lodash';
import { MigrationInterface, QueryRunner } from 'typeorm';

export class userIdToString1614510825911 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_eb26a8222f1ed29abbef861295"`);
    await queryRunner.query(`DROP TABLE "bets_participations"`);
    await queryRunner.query(`CREATE TABLE "bets_participations" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "userId" integer NOT NULL, "username" varchar NOT NULL, "points" bigint NOT NULL, "optionIdx" bigint NOT NULL, "betId" integer, CONSTRAINT "FK_f4888a939a9c39297bd786c5e9c" FOREIGN KEY ("betId") REFERENCES "bets" ("id") ON DELETE CASCADE ON UPDATE CASCADE)`);
    await queryRunner.query(`CREATE INDEX "IDX_eb26a8222f1ed29abbef861295" ON "bets_participations" ("userId") `);

    await queryRunner.query(`DROP TABLE "cooldown_viewer"`);
    await queryRunner.query(`CREATE TABLE "cooldown_viewer" ("id" varchar PRIMARY KEY NOT NULL, "userId" integer NOT NULL, "timestamp" bigint NOT NULL, "cooldownId" varchar, CONSTRAINT "FK_5ba6ccf5a51426111e322c80445" FOREIGN KEY ("cooldownId") REFERENCES "cooldown" ("id") ON DELETE CASCADE ON UPDATE CASCADE)`);

    const discordLink = await queryRunner.manager.getRepository(`discord_link`).find();
    await queryRunner.query(`DROP TABLE "discord_link"`);
    await queryRunner.query(`CREATE TABLE "discord_link" ("id" varchar PRIMARY KEY NOT NULL, "tag" varchar NOT NULL, "discordId" varchar NOT NULL, "createdAt" bigint NOT NULL, "userId" integer)`);
    await queryRunner.manager.getRepository(`discord_link`).insert(discordLink.map((o: any) => ({ ...o, userId: String(o.userId) })));

    await queryRunner.query(`DROP TABLE "duel"`);
    await queryRunner.query(`CREATE TABLE "duel" ("id" integer PRIMARY KEY NOT NULL, "username" varchar NOT NULL, "tickets" integer NOT NULL)`);

    await queryRunner.query(`DROP TABLE "heist_user"`);
    await queryRunner.query(`CREATE TABLE "heist_user" ("userId" integer PRIMARY KEY NOT NULL, "username" varchar NOT NULL, "points" bigint NOT NULL)`);

    await queryRunner.query(`DROP INDEX "IDX_69499e78c9ee1602baee77b97d"`);
    await queryRunner.query(`DROP INDEX "IDX_f941603aef2741795a9108d0d2"`);
    await queryRunner.query(`DROP TABLE "moderation_warning"`);
    await queryRunner.query(`DROP TABLE "moderation_permit"`);
    await queryRunner.query(`CREATE TABLE "moderation_warning" ("id" varchar PRIMARY KEY NOT NULL, "userId" varchar NOT NULL, "timestamp" bigint NOT NULL DEFAULT (0))`);
    await queryRunner.query(`CREATE INDEX "IDX_f941603aef2741795a9108d0d2" ON "moderation_warning" ("userId") `);
    await queryRunner.query(`CREATE TABLE "moderation_permit" ("id" varchar PRIMARY KEY NOT NULL, "userId" varchar NOT NULL)`);
    await queryRunner.query(`CREATE INDEX "IDX_69499e78c9ee1602baee77b97d" ON "moderation_permit" ("userId") `);

    const pointsChangelog = await queryRunner.manager.getRepository(`points_changelog`).find();
    await queryRunner.query(`DROP TABLE "points_changelog"`);
    await queryRunner.query(`CREATE TABLE "points_changelog" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "userId" varchar NOT NULL, "originalValue" integer NOT NULL, "updatedValue" integer NOT NULL, "updatedAt" bigint NOT NULL, "command" varchar NOT NULL)`);
    await queryRunner.query(`CREATE INDEX "IDX_points_changelog_userId" ON "points_changelog" ("userId") `);
    await queryRunner.manager.getRepository(`points_changelog`).insert(pointsChangelog.map((o: any) => ({ ...o, userId: String(o.userId) })));

    const quotes = await queryRunner.manager.getRepository(`quotes`).find();
    await queryRunner.query(`DROP TABLE "quotes"`);
    await queryRunner.query(`CREATE TABLE "quotes" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "tags" text NOT NULL, "quote" varchar NOT NULL, "quotedBy" varchar NOT NULL, "createdAt" bigint NOT NULL)`);
    await queryRunner.manager.getRepository(`quotes`).insert(quotes.map((o: any) => ({ ...o, quotedBy: String(o.userId) })));

    const user: any[][] = chunk(await queryRunner.manager.getRepository(`user`).find(), 10);
    const user_bit: any[][] = chunk(await queryRunner.manager.getRepository(`user_bit`).find(), 10);
    const user_tip: any[][] = chunk(await queryRunner.manager.getRepository(`user_tip`).find(), 10);
    await queryRunner.query(`DROP TABLE "user"`);
    await queryRunner.query(`DROP TABLE "user_bit"`);
    await queryRunner.query(`DROP TABLE "user_tip"`);
    await queryRunner.query(`CREATE TABLE "user" ("userId" varchar PRIMARY KEY NOT NULL, "username" varchar NOT NULL, "displayname" varchar NOT NULL DEFAULT (''), "profileImageUrl" varchar NOT NULL DEFAULT (''), "isOnline" boolean NOT NULL DEFAULT (0), "isVIP" boolean NOT NULL DEFAULT (0), "isFollower" boolean NOT NULL DEFAULT (0), "isModerator" boolean NOT NULL DEFAULT (0), "isSubscriber" boolean NOT NULL DEFAULT (0), "haveSubscriberLock" boolean NOT NULL DEFAULT (0), "haveFollowerLock" boolean NOT NULL DEFAULT (0), "haveSubscribedAtLock" boolean NOT NULL DEFAULT (0), "haveFollowedAtLock" boolean NOT NULL DEFAULT (0), "rank" varchar NOT NULL DEFAULT (''), "haveCustomRank" boolean NOT NULL DEFAULT (0), "followedAt" bigint NOT NULL DEFAULT (0), "followCheckAt" bigint NOT NULL DEFAULT (0), "subscribedAt" bigint NOT NULL DEFAULT (0), "seenAt" bigint NOT NULL DEFAULT (0), "createdAt" bigint NOT NULL DEFAULT (0), "watchedTime" bigint NOT NULL DEFAULT (0), "chatTimeOnline" bigint NOT NULL DEFAULT (0), "chatTimeOffline" bigint NOT NULL DEFAULT (0), "points" bigint NOT NULL DEFAULT (0), "pointsOnlineGivenAt" bigint NOT NULL DEFAULT (0), "pointsOfflineGivenAt" bigint NOT NULL DEFAULT (0), "pointsByMessageGivenAt" bigint NOT NULL DEFAULT (0), "subscribeTier" varchar NOT NULL DEFAULT ('0'), "subscribeCumulativeMonths" integer NOT NULL DEFAULT (0), "subscribeStreak" integer NOT NULL DEFAULT (0), "giftedSubscribes" bigint NOT NULL DEFAULT (0), "messages" bigint NOT NULL DEFAULT (0), "extra" text)`);
    await queryRunner.query(`CREATE INDEX "IDX_78a916df40e02a9deb1c4b75ed" ON "user" ("username") `);
    await queryRunner.query(`CREATE TABLE "temporary_user_tip" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "amount" float NOT NULL, "sortAmount" float NOT NULL, "exchangeRates" text NOT NULL, "currency" varchar NOT NULL, "message" text NOT NULL, "tippedAt" bigint NOT NULL DEFAULT (0), "userUserId" varchar, CONSTRAINT "FK_36683fb221201263b38344a9880" FOREIGN KEY ("userUserId") REFERENCES "user" ("userId") ON DELETE CASCADE ON UPDATE CASCADE)`);
    await queryRunner.query(`CREATE TABLE "user_bit" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "amount" bigint OT NULL, "message" text NOT NULL, "cheeredAt" bigint NOT NULL DEFAULT (0), "userUserId" varchar, CONSTRAINT "FK_cca96526faa532e7d20a0f775b0" FOREIGN KEY ("userUserId") REFERENCES "user" ("userId") ON DELETE CASCADE ON UPDATE CASCADE)`);

    for (const dataset of user) {
      for (const data of dataset) {
        await queryRunner.manager.getRepository(`user`).insert(data);
      }
    }
    for (const dataset of user_bit) {
      for (const data of dataset) {
        await queryRunner.manager.getRepository(`user_bit`).insert(data);
      }
    }
    for (const dataset of user_tip) {
      for (const data of dataset) {
        await queryRunner.manager.getRepository(`user_tip`).insert(data);
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    return;
  }
}