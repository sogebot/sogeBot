import { MigrationInterface, QueryRunner } from 'typeorm';

export class tipsAndBitsMessagesToText1573942908160 implements MigrationInterface {
  name = 'tipsAndBitsMessagesToText1573942908160';

  public async up(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(`CREATE TABLE "temporary_user_tip" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "amount" float NOT NULL, "currency" varchar NOT NULL, "message" varchar NOT NULL DEFAULT (''), "tippedAt" bigint NOT NULL DEFAULT (0), "sortAmount" float NOT NULL, "userUserId" integer, CONSTRAINT "FK_36683fb221201263b38344a9880" FOREIGN KEY ("userUserId") REFERENCES "user" ("userId") ON DELETE CASCADE ON UPDATE CASCADE)`, undefined);
    await queryRunner.query(`INSERT INTO "temporary_user_tip"("id", "amount", "currency", "message", "tippedAt", "sortAmount", "userUserId") SELECT "id", "amount", "currency", "message", "tippedAt", "sortAmount", "userUserId" FROM "user_tip"`, undefined);
    await queryRunner.query(`DROP TABLE "user_tip"`, undefined);
    await queryRunner.query(`ALTER TABLE "temporary_user_tip" RENAME TO "user_tip"`, undefined);
    await queryRunner.query(`CREATE TABLE "temporary_user_bit" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "amount" bigint NOT NULL, "message" varchar NOT NULL DEFAULT (''), "cheeredAt" bigint NOT NULL DEFAULT (0), "userUserId" integer, CONSTRAINT "FK_cca96526faa532e7d20a0f775b0" FOREIGN KEY ("userUserId") REFERENCES "user" ("userId") ON DELETE CASCADE ON UPDATE CASCADE)`, undefined);
    await queryRunner.query(`INSERT INTO "temporary_user_bit"("id", "amount", "message", "cheeredAt", "userUserId") SELECT "id", "amount", "message", "cheeredAt", "userUserId" FROM "user_bit"`, undefined);
    await queryRunner.query(`DROP TABLE "user_bit"`, undefined);
    await queryRunner.query(`ALTER TABLE "temporary_user_bit" RENAME TO "user_bit"`, undefined);
    await queryRunner.query(`CREATE TABLE "temporary_user_tip" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "amount" float NOT NULL, "currency" varchar NOT NULL, "message" text NOT NULL DEFAULT (''), "tippedAt" bigint NOT NULL DEFAULT (0), "sortAmount" float NOT NULL, "userUserId" integer, CONSTRAINT "FK_36683fb221201263b38344a9880" FOREIGN KEY ("userUserId") REFERENCES "user" ("userId") ON DELETE CASCADE ON UPDATE CASCADE)`, undefined);
    await queryRunner.query(`INSERT INTO "temporary_user_tip"("id", "amount", "currency", "message", "tippedAt", "sortAmount", "userUserId") SELECT "id", "amount", "currency", "message", "tippedAt", "sortAmount", "userUserId" FROM "user_tip"`, undefined);
    await queryRunner.query(`DROP TABLE "user_tip"`, undefined);
    await queryRunner.query(`ALTER TABLE "temporary_user_tip" RENAME TO "user_tip"`, undefined);
    await queryRunner.query(`CREATE TABLE "temporary_user_bit" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "amount" bigint NOT NULL, "message" text NOT NULL DEFAULT (''), "cheeredAt" bigint NOT NULL DEFAULT (0), "userUserId" integer, CONSTRAINT "FK_cca96526faa532e7d20a0f775b0" FOREIGN KEY ("userUserId") REFERENCES "user" ("userId") ON DELETE CASCADE ON UPDATE CASCADE)`, undefined);
    await queryRunner.query(`INSERT INTO "temporary_user_bit"("id", "amount", "message", "cheeredAt", "userUserId") SELECT "id", "amount", "message", "cheeredAt", "userUserId" FROM "user_bit"`, undefined);
    await queryRunner.query(`DROP TABLE "user_bit"`, undefined);
    await queryRunner.query(`ALTER TABLE "temporary_user_bit" RENAME TO "user_bit"`, undefined);
    await queryRunner.query(`DROP INDEX "IDX_4d8108fc3e8dcbe5c112f53dd3"`, undefined);
    await queryRunner.query(`CREATE TABLE "temporary_twitch_tag_localization_description" ("id" varchar PRIMARY KEY NOT NULL, "locale" varchar NOT NULL, "value" varchar NOT NULL, "tagId" varchar, CONSTRAINT "FK_4d8108fc3e8dcbe5c112f53dd3f" FOREIGN KEY ("tagId") REFERENCES "twitch_tag" ("tag_id") ON DELETE CASCADE ON UPDATE CASCADE)`, undefined);
    await queryRunner.query(`INSERT INTO "temporary_twitch_tag_localization_description"("id", "locale", "value", "tagId") SELECT "id", "locale", "value", "tagId" FROM "twitch_tag_localization_description"`, undefined);
    await queryRunner.query(`DROP TABLE "twitch_tag_localization_description"`, undefined);
    await queryRunner.query(`ALTER TABLE "temporary_twitch_tag_localization_description" RENAME TO "twitch_tag_localization_description"`, undefined);
    await queryRunner.query(`CREATE INDEX "IDX_4d8108fc3e8dcbe5c112f53dd3" ON "twitch_tag_localization_description" ("tagId") `, undefined);
    await queryRunner.query(`DROP INDEX "IDX_4d8108fc3e8dcbe5c112f53dd3"`, undefined);
    await queryRunner.query(`CREATE TABLE "temporary_twitch_tag_localization_description" ("id" varchar PRIMARY KEY NOT NULL, "locale" varchar NOT NULL, "value" text NOT NULL, "tagId" varchar, CONSTRAINT "FK_4d8108fc3e8dcbe5c112f53dd3f" FOREIGN KEY ("tagId") REFERENCES "twitch_tag" ("tag_id") ON DELETE CASCADE ON UPDATE CASCADE)`, undefined);
    await queryRunner.query(`INSERT INTO "temporary_twitch_tag_localization_description"("id", "locale", "value", "tagId") SELECT "id", "locale", "value", "tagId" FROM "twitch_tag_localization_description"`, undefined);
    await queryRunner.query(`DROP TABLE "twitch_tag_localization_description"`, undefined);
    await queryRunner.query(`ALTER TABLE "temporary_twitch_tag_localization_description" RENAME TO "twitch_tag_localization_description"`, undefined);
    await queryRunner.query(`CREATE INDEX "IDX_4d8108fc3e8dcbe5c112f53dd3" ON "twitch_tag_localization_description" ("tagId") `, undefined);
  }

  public async down(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(`ALTER TABLE "user_bit" RENAME TO "temporary_user_bit"`, undefined);
    await queryRunner.query(`CREATE TABLE "user_bit" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "amount" bigint NOT NULL, "message" varchar NOT NULL DEFAULT (''), "cheeredAt" bigint NOT NULL DEFAULT (0), "userUserId" integer, CONSTRAINT "FK_cca96526faa532e7d20a0f775b0" FOREIGN KEY ("userUserId") REFERENCES "user" ("userId") ON DELETE CASCADE ON UPDATE CASCADE)`, undefined);
    await queryRunner.query(`INSERT INTO "user_bit"("id", "amount", "message", "cheeredAt", "userUserId") SELECT "id", "amount", "message", "cheeredAt", "userUserId" FROM "temporary_user_bit"`, undefined);
    await queryRunner.query(`DROP TABLE "temporary_user_bit"`, undefined);
    await queryRunner.query(`ALTER TABLE "user_tip" RENAME TO "temporary_user_tip"`, undefined);
    await queryRunner.query(`CREATE TABLE "user_tip" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "amount" float NOT NULL, "currency" varchar NOT NULL, "message" varchar NOT NULL DEFAULT (''), "tippedAt" bigint NOT NULL DEFAULT (0), "sortAmount" float NOT NULL, "userUserId" integer, CONSTRAINT "FK_36683fb221201263b38344a9880" FOREIGN KEY ("userUserId") REFERENCES "user" ("userId") ON DELETE CASCADE ON UPDATE CASCADE)`, undefined);
    await queryRunner.query(`INSERT INTO "user_tip"("id", "amount", "currency", "message", "tippedAt", "sortAmount", "userUserId") SELECT "id", "amount", "currency", "message", "tippedAt", "sortAmount", "userUserId" FROM "temporary_user_tip"`, undefined);
    await queryRunner.query(`DROP TABLE "temporary_user_tip"`, undefined);
    await queryRunner.query(`ALTER TABLE "user_bit" RENAME TO "temporary_user_bit"`, undefined);
    await queryRunner.query(`CREATE TABLE "user_bit" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "amount" bigint NOT NULL, "message" varchar NOT NULL DEFAULT (''), "cheeredAt" bigint NOT NULL DEFAULT (0), "userUserId" integer, CONSTRAINT "FK_cca96526faa532e7d20a0f775b0" FOREIGN KEY ("userUserId") REFERENCES "user" ("userId") ON DELETE CASCADE ON UPDATE CASCADE)`, undefined);
    await queryRunner.query(`INSERT INTO "user_bit"("id", "amount", "message", "cheeredAt", "userUserId") SELECT "id", "amount", "message", "cheeredAt", "userUserId" FROM "temporary_user_bit"`, undefined);
    await queryRunner.query(`DROP TABLE "temporary_user_bit"`, undefined);
    await queryRunner.query(`ALTER TABLE "user_tip" RENAME TO "temporary_user_tip"`, undefined);
    await queryRunner.query(`CREATE TABLE "user_tip" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "amount" float NOT NULL, "currency" varchar NOT NULL, "message" varchar NOT NULL DEFAULT (''), "tippedAt" bigint NOT NULL DEFAULT (0), "sortAmount" float NOT NULL, "userUserId" integer, CONSTRAINT "FK_36683fb221201263b38344a9880" FOREIGN KEY ("userUserId") REFERENCES "user" ("userId") ON DELETE CASCADE ON UPDATE CASCADE)`, undefined);
    await queryRunner.query(`INSERT INTO "user_tip"("id", "amount", "currency", "message", "tippedAt", "sortAmount", "userUserId") SELECT "id", "amount", "currency", "message", "tippedAt", "sortAmount", "userUserId" FROM "temporary_user_tip"`, undefined);
    await queryRunner.query(`DROP TABLE "temporary_user_tip"`, undefined);
    await queryRunner.query(`DROP INDEX "IDX_4d8108fc3e8dcbe5c112f53dd3"`, undefined);
    await queryRunner.query(`ALTER TABLE "twitch_tag_localization_description" RENAME TO "temporary_twitch_tag_localization_description"`, undefined);
    await queryRunner.query(`CREATE TABLE "twitch_tag_localization_description" ("id" varchar PRIMARY KEY NOT NULL, "locale" varchar NOT NULL, "value" varchar NOT NULL, "tagId" varchar, CONSTRAINT "FK_4d8108fc3e8dcbe5c112f53dd3f" FOREIGN KEY ("tagId") REFERENCES "twitch_tag" ("tag_id") ON DELETE CASCADE ON UPDATE CASCADE)`, undefined);
    await queryRunner.query(`INSERT INTO "twitch_tag_localization_description"("id", "locale", "value", "tagId") SELECT "id", "locale", "value", "tagId" FROM "temporary_twitch_tag_localization_description"`, undefined);
    await queryRunner.query(`DROP TABLE "temporary_twitch_tag_localization_description"`, undefined);
    await queryRunner.query(`CREATE INDEX "IDX_4d8108fc3e8dcbe5c112f53dd3" ON "twitch_tag_localization_description" ("tagId") `, undefined);
    await queryRunner.query(`DROP INDEX "IDX_4d8108fc3e8dcbe5c112f53dd3"`, undefined);
    await queryRunner.query(`ALTER TABLE "twitch_tag_localization_description" RENAME TO "temporary_twitch_tag_localization_description"`, undefined);
    await queryRunner.query(`CREATE TABLE "twitch_tag_localization_description" ("id" varchar PRIMARY KEY NOT NULL, "locale" varchar NOT NULL, "value" varchar NOT NULL, "tagId" varchar, CONSTRAINT "FK_4d8108fc3e8dcbe5c112f53dd3f" FOREIGN KEY ("tagId") REFERENCES "twitch_tag" ("tag_id") ON DELETE CASCADE ON UPDATE CASCADE)`, undefined);
    await queryRunner.query(`INSERT INTO "twitch_tag_localization_description"("id", "locale", "value", "tagId") SELECT "id", "locale", "value", "tagId" FROM "temporary_twitch_tag_localization_description"`, undefined);
    await queryRunner.query(`DROP TABLE "temporary_twitch_tag_localization_description"`, undefined);
    await queryRunner.query(`CREATE INDEX "IDX_4d8108fc3e8dcbe5c112f53dd3" ON "twitch_tag_localization_description" ("tagId") `, undefined);
  }

}
