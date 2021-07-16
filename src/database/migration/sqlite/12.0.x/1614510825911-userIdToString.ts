import { MigrationInterface, QueryRunner } from 'typeorm';

export class userIdToString1614510825911 implements MigrationInterface {
  name = 'userIdToString1614510825911';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const discordLink = await queryRunner.manager.getRepository(`discord_link`).find();
    const pointsChangelog = await queryRunner.manager.getRepository(`points_changelog`).find();
    const quotes = await queryRunner.manager.getRepository(`quotes`).find();
    const user: any[] = (await queryRunner.manager.getRepository(`user`).find()).map((o: any) => ({ ...o, userId: String(o.userId) }));
    const user_bit: any[] = (await queryRunner.query(`SELECT * from "user_tip"`)).map((o: any) => ({ ...o, userId: String(o.userId) }));
    const user_tip: any[] = (await queryRunner.query(`SELECT * from "user_bit"`)).map((o: any) => ({ ...o, userId: String(o.userId) }));

    await queryRunner.query(`DROP INDEX "IDX_eb26a8222f1ed29abbef861295"`);
    await queryRunner.query(`CREATE TABLE "temporary_bets_participations" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "userId" integer NOT NULL, "username" varchar NOT NULL, "points" bigint NOT NULL, "optionIdx" bigint NOT NULL, "betId" integer, CONSTRAINT "FK_f4888a939a9c39297bd786c5e9c" FOREIGN KEY ("betId") REFERENCES "bets" ("id") ON DELETE CASCADE ON UPDATE CASCADE)`);
    await queryRunner.query(`INSERT INTO "temporary_bets_participations"("id", "userId", "username", "points", "optionIdx", "betId") SELECT "id", "userId", "username", "points", "optionIdx", "betId" FROM "bets_participations"`);
    await queryRunner.query(`DROP TABLE "bets_participations"`);
    await queryRunner.query(`ALTER TABLE "temporary_bets_participations" RENAME TO "bets_participations"`);
    await queryRunner.query(`CREATE INDEX "IDX_eb26a8222f1ed29abbef861295" ON "bets_participations" ("userId") `);
    await queryRunner.query(`CREATE TABLE "temporary_cooldown_viewer" ("id" varchar PRIMARY KEY NOT NULL, "userId" integer NOT NULL, "timestamp" bigint NOT NULL, "cooldownId" varchar, CONSTRAINT "FK_5ba6ccf5a51426111e322c80445" FOREIGN KEY ("cooldownId") REFERENCES "cooldown" ("id") ON DELETE CASCADE ON UPDATE CASCADE)`);
    await queryRunner.query(`INSERT INTO "temporary_cooldown_viewer"("id", "userId", "timestamp", "cooldownId") SELECT "id", "userId", "timestamp", "cooldownId" FROM "cooldown_viewer"`);
    await queryRunner.query(`DROP TABLE "cooldown_viewer"`);
    await queryRunner.query(`ALTER TABLE "temporary_cooldown_viewer" RENAME TO "cooldown_viewer"`);
    await queryRunner.query(`CREATE TABLE "temporary_discord_link" ("id" varchar PRIMARY KEY NOT NULL, "tag" varchar NOT NULL, "discordId" varchar NOT NULL, "createdAt" bigint NOT NULL, "userId" integer)`);
    await queryRunner.query(`INSERT INTO "temporary_discord_link"("id", "tag", "discordId", "createdAt", "userId") SELECT "id", "tag", "discordId", "createdAt", "userId" FROM "discord_link"`);
    await queryRunner.query(`DROP TABLE "discord_link"`);
    await queryRunner.query(`ALTER TABLE "temporary_discord_link" RENAME TO "discord_link"`);
    await queryRunner.query(`CREATE TABLE "temporary_duel" ("id" integer PRIMARY KEY NOT NULL, "username" varchar NOT NULL, "tickets" integer NOT NULL)`);
    await queryRunner.query(`INSERT INTO "temporary_duel"("id", "username", "tickets") SELECT "id", "username", "tickets" FROM "duel"`);
    await queryRunner.query(`DROP TABLE "duel"`);
    await queryRunner.query(`ALTER TABLE "temporary_duel" RENAME TO "duel"`);
    await queryRunner.query(`CREATE TABLE "temporary_heist_user" ("userId" integer PRIMARY KEY NOT NULL, "username" varchar NOT NULL, "points" bigint NOT NULL)`);
    await queryRunner.query(`INSERT INTO "temporary_heist_user"("userId", "username", "points") SELECT "userId", "username", "points" FROM "heist_user"`);
    await queryRunner.query(`DROP TABLE "heist_user"`);
    await queryRunner.query(`ALTER TABLE "temporary_heist_user" RENAME TO "heist_user"`);
    await queryRunner.query(`DROP INDEX "IDX_f941603aef2741795a9108d0d2"`);
    await queryRunner.query(`CREATE TABLE "temporary_moderation_warning" ("id" varchar PRIMARY KEY NOT NULL, "userId" integer NOT NULL, "timestamp" bigint NOT NULL DEFAULT (0))`);
    await queryRunner.query(`INSERT INTO "temporary_moderation_warning"("id", "userId", "timestamp") SELECT "id", "userId", "timestamp" FROM "moderation_warning"`);
    await queryRunner.query(`DROP TABLE "moderation_warning"`);
    await queryRunner.query(`ALTER TABLE "temporary_moderation_warning" RENAME TO "moderation_warning"`);
    await queryRunner.query(`CREATE INDEX "IDX_f941603aef2741795a9108d0d2" ON "moderation_warning" ("userId") `);
    await queryRunner.query(`DROP INDEX "IDX_69499e78c9ee1602baee77b97d"`);
    await queryRunner.query(`CREATE TABLE "temporary_moderation_permit" ("id" varchar PRIMARY KEY NOT NULL, "userId" integer NOT NULL)`);
    await queryRunner.query(`INSERT INTO "temporary_moderation_permit"("id", "userId") SELECT "id", "userId" FROM "moderation_permit"`);
    await queryRunner.query(`DROP TABLE "moderation_permit"`);
    await queryRunner.query(`ALTER TABLE "temporary_moderation_permit" RENAME TO "moderation_permit"`);
    await queryRunner.query(`CREATE INDEX "IDX_69499e78c9ee1602baee77b97d" ON "moderation_permit" ("userId") `);
    await queryRunner.query(`DROP INDEX "IDX_points_changelog_userId"`);
    await queryRunner.query(`CREATE TABLE "temporary_points_changelog" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "userId" integer NOT NULL, "originalValue" integer NOT NULL, "updatedValue" integer NOT NULL, "updatedAt" bigint NOT NULL, "command" varchar NOT NULL)`);
    await queryRunner.query(`INSERT INTO "temporary_points_changelog"("id", "userId", "originalValue", "updatedValue", "updatedAt", "command") SELECT "id", "userId", "originalValue", "updatedValue", "updatedAt", "command" FROM "points_changelog"`);
    await queryRunner.query(`DROP TABLE "points_changelog"`);
    await queryRunner.query(`ALTER TABLE "temporary_points_changelog" RENAME TO "points_changelog"`);
    await queryRunner.query(`CREATE INDEX "IDX_points_changelog_userId" ON "points_changelog" ("userId") `);
    await queryRunner.query(`CREATE TABLE "temporary_quotes" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "tags" text NOT NULL, "quote" varchar NOT NULL, "quotedBy" integer NOT NULL, "createdAt" bigint NOT NULL)`);
    await queryRunner.query(`INSERT INTO "temporary_quotes"("id", "tags", "quote", "quotedBy", "createdAt") SELECT "id", "tags", "quote", "quotedBy", "createdAt" FROM "quotes"`);
    await queryRunner.query(`DROP TABLE "quotes"`);
    await queryRunner.query(`ALTER TABLE "temporary_quotes" RENAME TO "quotes"`);
    await queryRunner.query(`DROP INDEX "IDX_78a916df40e02a9deb1c4b75ed"`);
    await queryRunner.query(`CREATE TABLE "temporary_user" ("userId" integer PRIMARY KEY NOT NULL, "username" varchar NOT NULL, "displayname" varchar NOT NULL DEFAULT (''), "profileImageUrl" varchar NOT NULL DEFAULT (''), "isOnline" boolean NOT NULL DEFAULT (0), "isVIP" boolean NOT NULL DEFAULT (0), "isFollower" boolean NOT NULL DEFAULT (0), "isModerator" boolean NOT NULL DEFAULT (0), "isSubscriber" boolean NOT NULL DEFAULT (0), "haveSubscriberLock" boolean NOT NULL DEFAULT (0), "haveFollowerLock" boolean NOT NULL DEFAULT (0), "haveSubscribedAtLock" boolean NOT NULL DEFAULT (0), "haveFollowedAtLock" boolean NOT NULL DEFAULT (0), "rank" varchar NOT NULL DEFAULT (''), "haveCustomRank" boolean NOT NULL DEFAULT (0), "followedAt" bigint NOT NULL DEFAULT (0), "followCheckAt" bigint NOT NULL DEFAULT (0), "subscribedAt" bigint NOT NULL DEFAULT (0), "seenAt" bigint NOT NULL DEFAULT (0), "createdAt" bigint NOT NULL DEFAULT (0), "watchedTime" bigint NOT NULL DEFAULT (0), "chatTimeOnline" bigint NOT NULL DEFAULT (0), "chatTimeOffline" bigint NOT NULL DEFAULT (0), "points" bigint NOT NULL DEFAULT (0), "pointsOnlineGivenAt" bigint NOT NULL DEFAULT (0), "pointsOfflineGivenAt" bigint NOT NULL DEFAULT (0), "pointsByMessageGivenAt" bigint NOT NULL DEFAULT (0), "subscribeTier" varchar NOT NULL DEFAULT ('0'), "subscribeCumulativeMonths" integer NOT NULL DEFAULT (0), "subscribeStreak" integer NOT NULL DEFAULT (0), "giftedSubscribes" bigint NOT NULL DEFAULT (0), "messages" bigint NOT NULL DEFAULT (0), "extra" text)`);
    await queryRunner.query(`INSERT INTO "temporary_user"("userId", "username", "displayname", "profileImageUrl", "isOnline", "isVIP", "isFollower", "isModerator", "isSubscriber", "haveSubscriberLock", "haveFollowerLock", "haveSubscribedAtLock", "haveFollowedAtLock", "rank", "haveCustomRank", "followedAt", "followCheckAt", "subscribedAt", "seenAt", "createdAt", "watchedTime", "chatTimeOnline", "chatTimeOffline", "points", "pointsOnlineGivenAt", "pointsOfflineGivenAt", "pointsByMessageGivenAt", "subscribeTier", "subscribeCumulativeMonths", "subscribeStreak", "giftedSubscribes", "messages", "extra") SELECT "userId", "username", "displayname", "profileImageUrl", "isOnline", "isVIP", "isFollower", "isModerator", "isSubscriber", "haveSubscriberLock", "haveFollowerLock", "haveSubscribedAtLock", "haveFollowedAtLock", "rank", "haveCustomRank", "followedAt", "followCheckAt", "subscribedAt", "seenAt", "createdAt", "watchedTime", "chatTimeOnline", "chatTimeOffline", "points", "pointsOnlineGivenAt", "pointsOfflineGivenAt", "pointsByMessageGivenAt", "subscribeTier", "subscribeCumulativeMonths", "subscribeStreak", "giftedSubscribes", "messages", "extra" FROM "user"`);
    await queryRunner.query(`DROP TABLE "user"`);
    await queryRunner.query(`ALTER TABLE "temporary_user" RENAME TO "user"`);
    await queryRunner.query(`CREATE INDEX "IDX_78a916df40e02a9deb1c4b75ed" ON "user" ("username") `);
    await queryRunner.query(`CREATE TABLE "temporary_user_tip" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "amount" float NOT NULL, "sortAmount" float NOT NULL, "exchangeRates" text NOT NULL, "currency" varchar NOT NULL, "message" text NOT NULL, "tippedAt" bigint NOT NULL DEFAULT (0), "userUserId" integer, CONSTRAINT "FK_36683fb221201263b38344a9880" FOREIGN KEY ("userUserId") REFERENCES "user" ("userId") ON DELETE CASCADE ON UPDATE CASCADE)`);
    await queryRunner.query(`INSERT INTO "temporary_user_tip"("id", "amount", "sortAmount", "exchangeRates", "currency", "message", "tippedAt", "userUserId") SELECT "id", "amount", "sortAmount", "exchangeRates", "currency", "message", "tippedAt", "userUserId" FROM "user_tip"`);
    await queryRunner.query(`DROP TABLE "user_tip"`);
    await queryRunner.query(`ALTER TABLE "temporary_user_tip" RENAME TO "user_tip"`);
    await queryRunner.query(`CREATE TABLE "temporary_user_bit" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "amount" bigint NOT NULL, "message" text NOT NULL, "cheeredAt" bigint NOT NULL DEFAULT (0), "userUserId" integer, CONSTRAINT "FK_cca96526faa532e7d20a0f775b0" FOREIGN KEY ("userUserId") REFERENCES "user" ("userId") ON DELETE CASCADE ON UPDATE CASCADE)`);
    await queryRunner.query(`INSERT INTO "temporary_user_bit"("id", "amount", "message", "cheeredAt", "userUserId") SELECT "id", "amount", "message", "cheeredAt", "userUserId" FROM "user_bit"`);
    await queryRunner.query(`DROP TABLE "user_bit"`);
    await queryRunner.query(`ALTER TABLE "temporary_user_bit" RENAME TO "user_bit"`);
    await queryRunner.query(`DROP INDEX "IDX_eb26a8222f1ed29abbef861295"`);
    await queryRunner.query(`CREATE TABLE "temporary_bets_participations" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "userId" varchar NOT NULL, "username" varchar NOT NULL, "points" bigint NOT NULL, "optionIdx" bigint NOT NULL, "betId" integer, CONSTRAINT "FK_f4888a939a9c39297bd786c5e9c" FOREIGN KEY ("betId") REFERENCES "bets" ("id") ON DELETE CASCADE ON UPDATE CASCADE)`);
    await queryRunner.query(`INSERT INTO "temporary_bets_participations"("id", "userId", "username", "points", "optionIdx", "betId") SELECT "id", "userId", "username", "points", "optionIdx", "betId" FROM "bets_participations"`);
    await queryRunner.query(`DROP TABLE "bets_participations"`);
    await queryRunner.query(`ALTER TABLE "temporary_bets_participations" RENAME TO "bets_participations"`);
    await queryRunner.query(`CREATE INDEX "IDX_eb26a8222f1ed29abbef861295" ON "bets_participations" ("userId") `);
    await queryRunner.query(`CREATE TABLE "temporary_cooldown_viewer" ("id" varchar PRIMARY KEY NOT NULL, "userId" varchar NOT NULL, "timestamp" bigint NOT NULL, "cooldownId" varchar, CONSTRAINT "FK_5ba6ccf5a51426111e322c80445" FOREIGN KEY ("cooldownId") REFERENCES "cooldown" ("id") ON DELETE CASCADE ON UPDATE CASCADE)`);
    await queryRunner.query(`INSERT INTO "temporary_cooldown_viewer"("id", "userId", "timestamp", "cooldownId") SELECT "id", "userId", "timestamp", "cooldownId" FROM "cooldown_viewer"`);
    await queryRunner.query(`DROP TABLE "cooldown_viewer"`);
    await queryRunner.query(`ALTER TABLE "temporary_cooldown_viewer" RENAME TO "cooldown_viewer"`);
    await queryRunner.query(`CREATE TABLE "temporary_discord_link" ("id" varchar PRIMARY KEY NOT NULL, "tag" varchar NOT NULL, "discordId" varchar NOT NULL, "createdAt" bigint NOT NULL, "userId" varchar)`);
    await queryRunner.query(`INSERT INTO "temporary_discord_link"("id", "tag", "discordId", "createdAt", "userId") SELECT "id", "tag", "discordId", "createdAt", "userId" FROM "discord_link"`);
    await queryRunner.query(`DROP TABLE "discord_link"`);
    await queryRunner.query(`ALTER TABLE "temporary_discord_link" RENAME TO "discord_link"`);
    await queryRunner.query(`CREATE TABLE "temporary_duel" ("id" varchar PRIMARY KEY NOT NULL, "username" varchar NOT NULL, "tickets" integer NOT NULL)`);
    await queryRunner.query(`INSERT INTO "temporary_duel"("id", "username", "tickets") SELECT "id", "username", "tickets" FROM "duel"`);
    await queryRunner.query(`DROP TABLE "duel"`);
    await queryRunner.query(`ALTER TABLE "temporary_duel" RENAME TO "duel"`);
    await queryRunner.query(`CREATE TABLE "temporary_heist_user" ("userId" varchar PRIMARY KEY NOT NULL, "username" varchar NOT NULL, "points" bigint NOT NULL)`);
    await queryRunner.query(`INSERT INTO "temporary_heist_user"("userId", "username", "points") SELECT "userId", "username", "points" FROM "heist_user"`);
    await queryRunner.query(`DROP TABLE "heist_user"`);
    await queryRunner.query(`ALTER TABLE "temporary_heist_user" RENAME TO "heist_user"`);
    await queryRunner.query(`DROP INDEX "IDX_f941603aef2741795a9108d0d2"`);
    await queryRunner.query(`CREATE TABLE "temporary_moderation_warning" ("id" varchar PRIMARY KEY NOT NULL, "userId" varchar NOT NULL, "timestamp" bigint NOT NULL DEFAULT (0))`);
    await queryRunner.query(`INSERT INTO "temporary_moderation_warning"("id", "userId", "timestamp") SELECT "id", "userId", "timestamp" FROM "moderation_warning"`);
    await queryRunner.query(`DROP TABLE "moderation_warning"`);
    await queryRunner.query(`ALTER TABLE "temporary_moderation_warning" RENAME TO "moderation_warning"`);
    await queryRunner.query(`CREATE INDEX "IDX_f941603aef2741795a9108d0d2" ON "moderation_warning" ("userId") `);
    await queryRunner.query(`DROP INDEX "IDX_69499e78c9ee1602baee77b97d"`);
    await queryRunner.query(`CREATE TABLE "temporary_moderation_permit" ("id" varchar PRIMARY KEY NOT NULL, "userId" varchar NOT NULL)`);
    await queryRunner.query(`INSERT INTO "temporary_moderation_permit"("id", "userId") SELECT "id", "userId" FROM "moderation_permit"`);
    await queryRunner.query(`DROP TABLE "moderation_permit"`);
    await queryRunner.query(`ALTER TABLE "temporary_moderation_permit" RENAME TO "moderation_permit"`);
    await queryRunner.query(`CREATE INDEX "IDX_69499e78c9ee1602baee77b97d" ON "moderation_permit" ("userId") `);
    await queryRunner.query(`DROP INDEX "IDX_points_changelog_userId"`);
    await queryRunner.query(`CREATE TABLE "temporary_points_changelog" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "userId" varchar NOT NULL, "originalValue" integer NOT NULL, "updatedValue" integer NOT NULL, "updatedAt" bigint NOT NULL, "command" varchar NOT NULL)`);
    await queryRunner.query(`INSERT INTO "temporary_points_changelog"("id", "userId", "originalValue", "updatedValue", "updatedAt", "command") SELECT "id", "userId", "originalValue", "updatedValue", "updatedAt", "command" FROM "points_changelog"`);
    await queryRunner.query(`DROP TABLE "points_changelog"`);
    await queryRunner.query(`ALTER TABLE "temporary_points_changelog" RENAME TO "points_changelog"`);
    await queryRunner.query(`CREATE INDEX "IDX_points_changelog_userId" ON "points_changelog" ("userId") `);
    await queryRunner.query(`CREATE TABLE "temporary_quotes" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "tags" text NOT NULL, "quote" varchar NOT NULL, "quotedBy" varchar NOT NULL, "createdAt" bigint NOT NULL)`);
    await queryRunner.query(`INSERT INTO "temporary_quotes"("id", "tags", "quote", "quotedBy", "createdAt") SELECT "id", "tags", "quote", "quotedBy", "createdAt" FROM "quotes"`);
    await queryRunner.query(`DROP TABLE "quotes"`);
    await queryRunner.query(`ALTER TABLE "temporary_quotes" RENAME TO "quotes"`);
    await queryRunner.query(`CREATE TABLE "temporary_user_bit" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "amount" bigint NOT NULL, "message" text NOT NULL, "cheeredAt" bigint NOT NULL DEFAULT (0), "userUserId" integer)`);
    await queryRunner.query(`INSERT INTO "temporary_user_bit"("id", "amount", "message", "cheeredAt", "userUserId") SELECT "id", "amount", "message", "cheeredAt", "userUserId" FROM "user_bit"`);
    await queryRunner.query(`DROP TABLE "user_bit"`);
    await queryRunner.query(`ALTER TABLE "temporary_user_bit" RENAME TO "user_bit"`);
    await queryRunner.query(`CREATE TABLE "temporary_user_tip" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "amount" float NOT NULL, "sortAmount" float NOT NULL, "exchangeRates" text NOT NULL, "currency" varchar NOT NULL, "message" text NOT NULL, "tippedAt" bigint NOT NULL DEFAULT (0), "userUserId" integer)`);
    await queryRunner.query(`INSERT INTO "temporary_user_tip"("id", "amount", "sortAmount", "exchangeRates", "currency", "message", "tippedAt", "userUserId") SELECT "id", "amount", "sortAmount", "exchangeRates", "currency", "message", "tippedAt", "userUserId" FROM "user_tip"`);
    await queryRunner.query(`DROP TABLE "user_tip"`);
    await queryRunner.query(`ALTER TABLE "temporary_user_tip" RENAME TO "user_tip"`);
    await queryRunner.query(`DROP INDEX "IDX_78a916df40e02a9deb1c4b75ed"`);
    await queryRunner.query(`CREATE TABLE "temporary_user" ("userId" varchar PRIMARY KEY NOT NULL, "username" varchar NOT NULL, "displayname" varchar NOT NULL DEFAULT (''), "profileImageUrl" varchar NOT NULL DEFAULT (''), "isOnline" boolean NOT NULL DEFAULT (0), "isVIP" boolean NOT NULL DEFAULT (0), "isFollower" boolean NOT NULL DEFAULT (0), "isModerator" boolean NOT NULL DEFAULT (0), "isSubscriber" boolean NOT NULL DEFAULT (0), "haveSubscriberLock" boolean NOT NULL DEFAULT (0), "haveFollowerLock" boolean NOT NULL DEFAULT (0), "haveSubscribedAtLock" boolean NOT NULL DEFAULT (0), "haveFollowedAtLock" boolean NOT NULL DEFAULT (0), "rank" varchar NOT NULL DEFAULT (''), "haveCustomRank" boolean NOT NULL DEFAULT (0), "followedAt" bigint NOT NULL DEFAULT (0), "followCheckAt" bigint NOT NULL DEFAULT (0), "subscribedAt" bigint NOT NULL DEFAULT (0), "seenAt" bigint NOT NULL DEFAULT (0), "createdAt" bigint NOT NULL DEFAULT (0), "watchedTime" bigint NOT NULL DEFAULT (0), "chatTimeOnline" bigint NOT NULL DEFAULT (0), "chatTimeOffline" bigint NOT NULL DEFAULT (0), "points" bigint NOT NULL DEFAULT (0), "pointsOnlineGivenAt" bigint NOT NULL DEFAULT (0), "pointsOfflineGivenAt" bigint NOT NULL DEFAULT (0), "pointsByMessageGivenAt" bigint NOT NULL DEFAULT (0), "subscribeTier" varchar NOT NULL DEFAULT ('0'), "subscribeCumulativeMonths" integer NOT NULL DEFAULT (0), "subscribeStreak" integer NOT NULL DEFAULT (0), "giftedSubscribes" bigint NOT NULL DEFAULT (0), "messages" bigint NOT NULL DEFAULT (0), "extra" text)`);
    await queryRunner.query(`INSERT INTO "temporary_user"("userId", "username", "displayname", "profileImageUrl", "isOnline", "isVIP", "isFollower", "isModerator", "isSubscriber", "haveSubscriberLock", "haveFollowerLock", "haveSubscribedAtLock", "haveFollowedAtLock", "rank", "haveCustomRank", "followedAt", "followCheckAt", "subscribedAt", "seenAt", "createdAt", "watchedTime", "chatTimeOnline", "chatTimeOffline", "points", "pointsOnlineGivenAt", "pointsOfflineGivenAt", "pointsByMessageGivenAt", "subscribeTier", "subscribeCumulativeMonths", "subscribeStreak", "giftedSubscribes", "messages", "extra") SELECT "userId", "username", "displayname", "profileImageUrl", "isOnline", "isVIP", "isFollower", "isModerator", "isSubscriber", "haveSubscriberLock", "haveFollowerLock", "haveSubscribedAtLock", "haveFollowedAtLock", "rank", "haveCustomRank", "followedAt", "followCheckAt", "subscribedAt", "seenAt", "createdAt", "watchedTime", "chatTimeOnline", "chatTimeOffline", "points", "pointsOnlineGivenAt", "pointsOfflineGivenAt", "pointsByMessageGivenAt", "subscribeTier", "subscribeCumulativeMonths", "subscribeStreak", "giftedSubscribes", "messages", "extra" FROM "user"`);
    await queryRunner.query(`DROP TABLE "user"`);
    await queryRunner.query(`ALTER TABLE "temporary_user" RENAME TO "user"`);
    await queryRunner.query(`CREATE INDEX "IDX_78a916df40e02a9deb1c4b75ed" ON "user" ("username") `);
    await queryRunner.query(`CREATE TABLE "temporary_user_tip" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "amount" float NOT NULL, "sortAmount" float NOT NULL, "exchangeRates" text NOT NULL, "currency" varchar NOT NULL, "message" text NOT NULL, "tippedAt" bigint NOT NULL DEFAULT (0), "userUserId" varchar)`);
    await queryRunner.query(`INSERT INTO "temporary_user_tip"("id", "amount", "sortAmount", "exchangeRates", "currency", "message", "tippedAt", "userUserId") SELECT "id", "amount", "sortAmount", "exchangeRates", "currency", "message", "tippedAt", "userUserId" FROM "user_tip"`);
    await queryRunner.query(`DROP TABLE "user_tip"`);
    await queryRunner.query(`ALTER TABLE "temporary_user_tip" RENAME TO "user_tip"`);
    await queryRunner.query(`CREATE TABLE "temporary_user_bit" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "amount" bigint NOT NULL, "message" text NOT NULL, "cheeredAt" bigint NOT NULL DEFAULT (0), "userUserId" varchar)`);
    await queryRunner.query(`INSERT INTO "temporary_user_bit"("id", "amount", "message", "cheeredAt", "userUserId") SELECT "id", "amount", "message", "cheeredAt", "userUserId" FROM "user_bit"`);
    await queryRunner.query(`DROP TABLE "user_bit"`);
    await queryRunner.query(`ALTER TABLE "temporary_user_bit" RENAME TO "user_bit"`);
    await queryRunner.query(`CREATE TABLE "temporary_user_tip" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "amount" float NOT NULL, "sortAmount" float NOT NULL, "exchangeRates" text NOT NULL, "currency" varchar NOT NULL, "message" text NOT NULL, "tippedAt" bigint NOT NULL DEFAULT (0), "userUserId" varchar, CONSTRAINT "FK_36683fb221201263b38344a9880" FOREIGN KEY ("userUserId") REFERENCES "user" ("userId") ON DELETE CASCADE ON UPDATE CASCADE)`);
    await queryRunner.query(`INSERT INTO "temporary_user_tip"("id", "amount", "sortAmount", "exchangeRates", "currency", "message", "tippedAt", "userUserId") SELECT "id", "amount", "sortAmount", "exchangeRates", "currency", "message", "tippedAt", "userUserId" FROM "user_tip"`);
    await queryRunner.query(`DROP TABLE "user_tip"`);
    await queryRunner.query(`ALTER TABLE "temporary_user_tip" RENAME TO "user_tip"`);
    await queryRunner.query(`CREATE TABLE "temporary_user_bit" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "amount" bigint NOT NULL, "message" text NOT NULL, "cheeredAt" bigint NOT NULL DEFAULT (0), "userUserId" varchar, CONSTRAINT "FK_cca96526faa532e7d20a0f775b0" FOREIGN KEY ("userUserId") REFERENCES "user" ("userId") ON DELETE CASCADE ON UPDATE CASCADE)`);
    await queryRunner.query(`INSERT INTO "temporary_user_bit"("id", "amount", "message", "cheeredAt", "userUserId") SELECT "id", "amount", "message", "cheeredAt", "userUserId" FROM "user_bit"`);
    await queryRunner.query(`DROP TABLE "user_bit"`);
    await queryRunner.query(`ALTER TABLE "temporary_user_bit" RENAME TO "user_bit"`);

    await queryRunner.manager.getRepository(`discord_link`).clear();
    await queryRunner.manager.getRepository(`discord_link`).insert(discordLink.map((o: any) => ({ ...o, userId: String(o.userId) })));
    await queryRunner.manager.getRepository(`points_changelog`).clear();
    await queryRunner.manager.getRepository(`points_changelog`).insert(pointsChangelog.map((o: any) => ({ ...o, userId: String(o.userId) })));
    await queryRunner.manager.getRepository(`quotes`).clear();
    await queryRunner.manager.getRepository(`quotes`).insert(quotes.map((o: any) => ({ ...o, quotedBy: String(o.quotedBy) })));

    await queryRunner.query(`DELETE FROM "user" WHERE 1=1`);
    await queryRunner.query(`DELETE FROM "user_bit" WHERE 1=1`);
    await queryRunner.query(`DELETE FROM "user_tip" WHERE 1=1`);

    for (const data of user) {
      await queryRunner.manager.getRepository(`user`).save(data);
    }
    for (const data of user_bit) {
      await queryRunner.manager.getRepository(`user_bit`).save(data);
    }
    for (const data of user_tip) {
      await queryRunner.manager.getRepository(`user_tip`).save(data);
    }

    await queryRunner.query(`DROP INDEX "IDX_dashboard_userId_createdAt_type"`);
    await queryRunner.query(`CREATE TABLE "temporary_dashboard" ("id" varchar PRIMARY KEY NOT NULL, "name" varchar NOT NULL, "createdAt" bigint NOT NULL, "userId" integer NOT NULL, "type" varchar(6) NOT NULL)`);
    await queryRunner.query(`INSERT INTO "temporary_dashboard"("id", "name", "createdAt", "userId", "type") SELECT "id", "name", "createdAt", "userId", "type" FROM "dashboard"`);
    await queryRunner.query(`DROP TABLE "dashboard"`);
    await queryRunner.query(`ALTER TABLE "temporary_dashboard" RENAME TO "dashboard"`);
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_dashboard_userId_createdAt_type" ON "dashboard" ("userId", "createdAt", "type") `);
    await queryRunner.query(`CREATE TABLE "temporary_variable_history" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "userId" integer NOT NULL DEFAULT (0), "username" varchar NOT NULL DEFAULT ('n/a'), "currentValue" varchar NOT NULL, "oldValue" text NOT NULL, "changedAt" bigint NOT NULL DEFAULT (0), "variableId" varchar, CONSTRAINT "FK_94d39c77652e9c332751a0cee02" FOREIGN KEY ("variableId") REFERENCES "variable" ("id") ON DELETE CASCADE ON UPDATE CASCADE)`);
    await queryRunner.query(`INSERT INTO "temporary_variable_history"("id", "userId", "username", "currentValue", "oldValue", "changedAt", "variableId") SELECT "id", "userId", "username", "currentValue", "oldValue", "changedAt", "variableId" FROM "variable_history"`);
    await queryRunner.query(`DROP TABLE "variable_history"`);
    await queryRunner.query(`ALTER TABLE "temporary_variable_history" RENAME TO "variable_history"`);
    await queryRunner.query(`DROP INDEX "IDX_dashboard_userId_createdAt_type"`);
    await queryRunner.query(`CREATE TABLE "temporary_dashboard" ("id" varchar PRIMARY KEY NOT NULL, "name" varchar NOT NULL, "createdAt" bigint NOT NULL, "userId" varchar NOT NULL, "type" varchar(6) NOT NULL)`);
    await queryRunner.query(`INSERT INTO "temporary_dashboard"("id", "name", "createdAt", "userId", "type") SELECT "id", "name", "createdAt", "userId", "type" FROM "dashboard"`);
    await queryRunner.query(`DROP TABLE "dashboard"`);
    await queryRunner.query(`ALTER TABLE "temporary_dashboard" RENAME TO "dashboard"`);
    await queryRunner.query(`CREATE TABLE "temporary_variable_history" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "userId" varchar NOT NULL DEFAULT ('0'), "username" varchar NOT NULL DEFAULT ('n/a'), "currentValue" varchar NOT NULL, "oldValue" text NOT NULL, "changedAt" bigint NOT NULL DEFAULT (0), "variableId" varchar, CONSTRAINT "FK_94d39c77652e9c332751a0cee02" FOREIGN KEY ("variableId") REFERENCES "variable" ("id") ON DELETE CASCADE ON UPDATE CASCADE)`);
    await queryRunner.query(`INSERT INTO "temporary_variable_history"("id", "userId", "username", "currentValue", "oldValue", "changedAt", "variableId") SELECT "id", "userId", "username", "currentValue", "oldValue", "changedAt", "variableId" FROM "variable_history"`);
    await queryRunner.query(`DROP TABLE "variable_history"`);
    await queryRunner.query(`ALTER TABLE "temporary_variable_history" RENAME TO "variable_history"`);
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_dashboard_userId_createdAt_type" ON "dashboard" ("userId", "createdAt", "type") `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    return;
  }
}