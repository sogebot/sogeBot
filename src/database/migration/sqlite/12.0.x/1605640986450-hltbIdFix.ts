import { MigrationInterface, QueryRunner } from 'typeorm';

export class hltbIdFix1605640986450 implements MigrationInterface {
  name = 'hltbIdFix1605640986450';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_hltb_id"`);
    await queryRunner.query(`CREATE TABLE "temporary_how_long_to_beat_game_item" ("id" varchar PRIMARY KEY NOT NULL, "hltb_id" integer NOT NULL, "createdAt" bigint NOT NULL, "timestamp" bigint NOT NULL DEFAULT (0), "offset" bigint NOT NULL DEFAULT (0), "isMainCounted" boolean NOT NULL DEFAULT (0), "isExtraCounted" boolean NOT NULL DEFAULT (0), "isCompletionistCounted" boolean NOT NULL DEFAULT (0))`);
    await queryRunner.query(`INSERT INTO "temporary_how_long_to_beat_game_item"("id", "hltb_id", "createdAt", "timestamp", "offset", "isMainCounted", "isExtraCounted", "isCompletionistCounted") SELECT "id", "hltb_id", "createdAt", "timestamp", "offset", "isMainCounted", "isExtraCounted", "isCompletionistCounted" FROM "how_long_to_beat_game_item"`);
    await queryRunner.query(`DROP TABLE "how_long_to_beat_game_item"`);
    await queryRunner.query(`ALTER TABLE "temporary_how_long_to_beat_game_item" RENAME TO "how_long_to_beat_game_item"`);
    await queryRunner.query(`CREATE INDEX "IDX_hltb_id" ON "how_long_to_beat_game_item" ("hltb_id") `);
    await queryRunner.query(`DROP INDEX "IDX_hltb_id"`);
    await queryRunner.query(`CREATE TABLE "temporary_how_long_to_beat_game_item" ("id" varchar PRIMARY KEY NOT NULL, "hltb_id" varchar NOT NULL, "createdAt" bigint NOT NULL, "timestamp" bigint NOT NULL DEFAULT (0), "offset" bigint NOT NULL DEFAULT (0), "isMainCounted" boolean NOT NULL DEFAULT (0), "isExtraCounted" boolean NOT NULL DEFAULT (0), "isCompletionistCounted" boolean NOT NULL DEFAULT (0))`);
    await queryRunner.query(`INSERT INTO "temporary_how_long_to_beat_game_item"("id", "hltb_id", "createdAt", "timestamp", "offset", "isMainCounted", "isExtraCounted", "isCompletionistCounted") SELECT "id", "hltb_id", "createdAt", "timestamp", "offset", "isMainCounted", "isExtraCounted", "isCompletionistCounted" FROM "how_long_to_beat_game_item"`);
    await queryRunner.query(`DROP TABLE "how_long_to_beat_game_item"`);
    await queryRunner.query(`ALTER TABLE "temporary_how_long_to_beat_game_item" RENAME TO "how_long_to_beat_game_item"`);
    await queryRunner.query(`CREATE INDEX "IDX_hltb_id" ON "how_long_to_beat_game_item" ("hltb_id") `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_hltb_id"`);
    await queryRunner.query(`ALTER TABLE "how_long_to_beat_game_item" RENAME TO "temporary_how_long_to_beat_game_item"`);
    await queryRunner.query(`CREATE TABLE "how_long_to_beat_game_item" ("id" varchar PRIMARY KEY NOT NULL, "hltb_id" integer NOT NULL, "createdAt" bigint NOT NULL, "timestamp" bigint NOT NULL DEFAULT (0), "offset" bigint NOT NULL DEFAULT (0), "isMainCounted" boolean NOT NULL DEFAULT (0), "isExtraCounted" boolean NOT NULL DEFAULT (0), "isCompletionistCounted" boolean NOT NULL DEFAULT (0))`);
    await queryRunner.query(`INSERT INTO "how_long_to_beat_game_item"("id", "hltb_id", "createdAt", "timestamp", "offset", "isMainCounted", "isExtraCounted", "isCompletionistCounted") SELECT "id", "hltb_id", "createdAt", "timestamp", "offset", "isMainCounted", "isExtraCounted", "isCompletionistCounted" FROM "temporary_how_long_to_beat_game_item"`);
    await queryRunner.query(`DROP TABLE "temporary_how_long_to_beat_game_item"`);
    await queryRunner.query(`CREATE INDEX "IDX_hltb_id" ON "how_long_to_beat_game_item" ("hltb_id") `);
    await queryRunner.query(`DROP INDEX "IDX_hltb_id"`);
    await queryRunner.query(`ALTER TABLE "how_long_to_beat_game_item" RENAME TO "temporary_how_long_to_beat_game_item"`);
    await queryRunner.query(`CREATE TABLE "how_long_to_beat_game_item" ("id" varchar PRIMARY KEY NOT NULL, "hltb_id" integer NOT NULL, "createdAt" bigint NOT NULL, "timestamp" bigint NOT NULL DEFAULT (0), "offset" bigint NOT NULL DEFAULT (0), "isMainCounted" boolean NOT NULL DEFAULT (0), "isExtraCounted" boolean NOT NULL DEFAULT (0), "isCompletionistCounted" boolean NOT NULL DEFAULT (0))`);
    await queryRunner.query(`INSERT INTO "how_long_to_beat_game_item"("id", "hltb_id", "createdAt", "timestamp", "offset", "isMainCounted", "isExtraCounted", "isCompletionistCounted") SELECT "id", "hltb_id", "createdAt", "timestamp", "offset", "isMainCounted", "isExtraCounted", "isCompletionistCounted" FROM "temporary_how_long_to_beat_game_item"`);
    await queryRunner.query(`DROP TABLE "temporary_how_long_to_beat_game_item"`);
    await queryRunner.query(`CREATE INDEX "IDX_hltb_id" ON "how_long_to_beat_game_item" ("hltb_id") `);
  }

}
