import { MigrationInterface, QueryRunner } from 'typeorm';

export class retypeUserDates1651843397008 implements MigrationInterface {
  name = 'retypeUserDates1651843397008';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const viewers = await queryRunner.query(`SELECT * FROM "user"`);

    await queryRunner.query(`DROP INDEX "IDX_78a916df40e02a9deb1c4b75ed"`);
    await queryRunner.query(`CREATE TABLE "temporary_user" ("userId" varchar PRIMARY KEY NOT NULL, "userName" varchar NOT NULL, "displayname" varchar NOT NULL DEFAULT (''), "profileImageUrl" varchar NOT NULL DEFAULT (''), "isOnline" boolean NOT NULL DEFAULT (0), "isVIP" boolean NOT NULL DEFAULT (0), "isFollower" boolean NOT NULL DEFAULT (0), "isModerator" boolean NOT NULL DEFAULT (0), "isSubscriber" boolean NOT NULL DEFAULT (0), "haveSubscriberLock" boolean NOT NULL DEFAULT (0), "haveFollowerLock" boolean NOT NULL DEFAULT (0), "haveSubscribedAtLock" boolean NOT NULL DEFAULT (0), "haveFollowedAtLock" boolean NOT NULL DEFAULT (0), "rank" varchar NOT NULL DEFAULT (''), "haveCustomRank" boolean NOT NULL DEFAULT (0), "followedAt" bigint NOT NULL DEFAULT (0), "followCheckAt" bigint NOT NULL DEFAULT (0), "subscribedAt" bigint NOT NULL DEFAULT (0), "seenAt" bigint NOT NULL DEFAULT (0), "createdAt" bigint NOT NULL DEFAULT (0), "watchedTime" bigint NOT NULL DEFAULT (0), "chatTimeOnline" bigint NOT NULL DEFAULT (0), "chatTimeOffline" bigint NOT NULL DEFAULT (0), "points" bigint NOT NULL DEFAULT (0), "pointsOnlineGivenAt" bigint NOT NULL DEFAULT (0), "pointsOfflineGivenAt" bigint NOT NULL DEFAULT (0), "pointsByMessageGivenAt" bigint NOT NULL DEFAULT (0), "subscribeTier" varchar NOT NULL DEFAULT ('0'), "subscribeCumulativeMonths" integer NOT NULL DEFAULT (0), "subscribeStreak" integer NOT NULL DEFAULT (0), "giftedSubscribes" bigint NOT NULL DEFAULT (0), "messages" bigint NOT NULL DEFAULT (0), "extra" text)`);
    await queryRunner.query(`INSERT INTO "temporary_user"("userId", "userName", "displayname", "profileImageUrl", "isOnline", "isVIP", "isFollower", "isModerator", "isSubscriber", "haveSubscriberLock", "haveFollowerLock", "haveSubscribedAtLock", "haveFollowedAtLock", "rank", "haveCustomRank", "followedAt", "followCheckAt", "subscribedAt", "seenAt", "createdAt", "watchedTime", "chatTimeOnline", "chatTimeOffline", "points", "pointsOnlineGivenAt", "pointsOfflineGivenAt", "pointsByMessageGivenAt", "subscribeTier", "subscribeCumulativeMonths", "subscribeStreak", "giftedSubscribes", "messages", "extra") SELECT "userId", "userName", "displayname", "profileImageUrl", "isOnline", "isVIP", "isFollower", "isModerator", "isSubscriber", "haveSubscriberLock", "haveFollowerLock", "haveSubscribedAtLock", "haveFollowedAtLock", "rank", "haveCustomRank", "followedAt", "followCheckAt", "subscribedAt", "seenAt", "createdAt", "watchedTime", "chatTimeOnline", "chatTimeOffline", "points", "pointsOnlineGivenAt", "pointsOfflineGivenAt", "pointsByMessageGivenAt", "subscribeTier", "subscribeCumulativeMonths", "subscribeStreak", "giftedSubscribes", "messages", "extra" FROM "user"`);
    await queryRunner.query(`DROP TABLE "user"`);
    await queryRunner.query(`ALTER TABLE "temporary_user" RENAME TO "user"`);
    await queryRunner.query(`CREATE INDEX "IDX_78a916df40e02a9deb1c4b75ed" ON "user" ("userName") `);
    await queryRunner.query(`DROP INDEX "IDX_78a916df40e02a9deb1c4b75ed"`);
    await queryRunner.query(`CREATE TABLE "temporary_user" ("userId" varchar PRIMARY KEY NOT NULL, "userName" varchar NOT NULL, "displayname" varchar NOT NULL DEFAULT (''), "profileImageUrl" varchar NOT NULL DEFAULT (''), "isOnline" boolean NOT NULL DEFAULT (0), "isVIP" boolean NOT NULL DEFAULT (0), "isFollower" boolean NOT NULL DEFAULT (0), "isModerator" boolean NOT NULL DEFAULT (0), "isSubscriber" boolean NOT NULL DEFAULT (0), "haveSubscriberLock" boolean NOT NULL DEFAULT (0), "haveFollowerLock" boolean NOT NULL DEFAULT (0), "haveSubscribedAtLock" boolean NOT NULL DEFAULT (0), "haveFollowedAtLock" boolean NOT NULL DEFAULT (0), "rank" varchar NOT NULL DEFAULT (''), "haveCustomRank" boolean NOT NULL DEFAULT (0), "followedAt" varchar(30), "followCheckAt" bigint NOT NULL DEFAULT (0), "subscribedAt" varchar(30), "seenAt" varchar(30), "createdAt" varchar(30), "watchedTime" bigint NOT NULL DEFAULT (0), "chatTimeOnline" bigint NOT NULL DEFAULT (0), "chatTimeOffline" bigint NOT NULL DEFAULT (0), "points" bigint NOT NULL DEFAULT (0), "pointsOnlineGivenAt" bigint NOT NULL DEFAULT (0), "pointsOfflineGivenAt" bigint NOT NULL DEFAULT (0), "pointsByMessageGivenAt" bigint NOT NULL DEFAULT (0), "subscribeTier" varchar NOT NULL DEFAULT ('0'), "subscribeCumulativeMonths" integer NOT NULL DEFAULT (0), "subscribeStreak" integer NOT NULL DEFAULT (0), "giftedSubscribes" bigint NOT NULL DEFAULT (0), "messages" bigint NOT NULL DEFAULT (0), "extra" text)`);
    await queryRunner.query(`INSERT INTO "temporary_user"("userId", "userName", "displayname", "profileImageUrl", "isOnline", "isVIP", "isFollower", "isModerator", "isSubscriber", "haveSubscriberLock", "haveFollowerLock", "haveSubscribedAtLock", "haveFollowedAtLock", "rank", "haveCustomRank", "followedAt", "followCheckAt", "subscribedAt", "seenAt", "createdAt", "watchedTime", "chatTimeOnline", "chatTimeOffline", "points", "pointsOnlineGivenAt", "pointsOfflineGivenAt", "pointsByMessageGivenAt", "subscribeTier", "subscribeCumulativeMonths", "subscribeStreak", "giftedSubscribes", "messages", "extra") SELECT "userId", "userName", "displayname", "profileImageUrl", "isOnline", "isVIP", "isFollower", "isModerator", "isSubscriber", "haveSubscriberLock", "haveFollowerLock", "haveSubscribedAtLock", "haveFollowedAtLock", "rank", "haveCustomRank", "followedAt", "followCheckAt", "subscribedAt", "seenAt", "createdAt", "watchedTime", "chatTimeOnline", "chatTimeOffline", "points", "pointsOnlineGivenAt", "pointsOfflineGivenAt", "pointsByMessageGivenAt", "subscribeTier", "subscribeCumulativeMonths", "subscribeStreak", "giftedSubscribes", "messages", "extra" FROM "user"`);
    await queryRunner.query(`DROP TABLE "user"`);
    await queryRunner.query(`ALTER TABLE "temporary_user" RENAME TO "user"`);
    await queryRunner.query(`CREATE INDEX "IDX_78a916df40e02a9deb1c4b75ed" ON "user" ("userName") `);

    // retype users
    for (const viewer of viewers) {
      viewer.followedAt = Number(viewer.followedAt) === 0 ? null : new Date(Number(viewer.followedAt)).toISOString();
      viewer.subscribedAt = Number(viewer.subscribedAt) === 0 ? null : new Date(Number(viewer.subscribedAt)).toISOString();
      viewer.seenAt = Number(viewer.seenAt) === 0 ? null : new Date(Number(viewer.seenAt)).toISOString();
      viewer.createdAt = Number(viewer.createdAt) === 0 ? null : new Date(Number(viewer.createdAt)).toISOString();
      await queryRunner.query(
        `UPDATE "user" SET "followedAt"=?,"subscribedAt"=?,"seenAt"=?,"createdAt"=? WHERE "userId"=?`,
        [ viewer.followedAt, viewer.subscribedAt, viewer.seenAt, viewer.createdAt, viewer.userId ]
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    return;
  }

}
