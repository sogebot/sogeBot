import { MigrationInterface, QueryRunner } from 'typeorm';

import { insertItemIntoTable } from '~/database/insertItemIntoTable';

export class changeHLTBTimestamps1651843397006 implements MigrationInterface {
  name = 'changeHLTBTimestamps1651843397006';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const games = await queryRunner.query(`SELECT * from "how_long_to_beat_game"`);
    const items = await queryRunner.query(`SELECT * from "how_long_to_beat_game_item"`);

    await queryRunner.query(`DROP INDEX "IDX_hltb_id"`);
    await queryRunner.query(`DROP TABLE "how_long_to_beat_game"`);
    await queryRunner.query(`DROP TABLE "how_long_to_beat_game_item"`);

    await queryRunner.query(`CREATE TABLE "how_long_to_beat_game" ("id" varchar PRIMARY KEY NOT NULL, "game" varchar NOT NULL, "startedAt" varchar NOT NULL, "updatedAt" varchar NOT NULL, "gameplayMain" float NOT NULL DEFAULT (0), "gameplayCompletionist" float NOT NULL DEFAULT (0), "gameplayMainExtra" float NOT NULL DEFAULT (0), "offset" bigint NOT NULL DEFAULT (0))`);
    await queryRunner.query(`CREATE TABLE "how_long_to_beat_game_item" ("id" varchar PRIMARY KEY NOT NULL, "hltb_id" varchar NOT NULL, "createdAt" varchar NOT NULL, "timestamp" bigint NOT NULL DEFAULT (0), "offset" bigint NOT NULL DEFAULT (0), "isMainCounted" boolean NOT NULL DEFAULT (0), "isExtraCounted" boolean NOT NULL DEFAULT (0), "isCompletionistCounted" boolean NOT NULL DEFAULT (0))`);

    await queryRunner.query(`CREATE INDEX "IDX_hltb_id" ON "how_long_to_beat_game_item" ("hltb_id") `);
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_301758e0e3108fc902d5436527" ON "how_long_to_beat_game" ("game") `);

    for (const item of games) {
      delete item.imageUrl;

      item.startedAt = new Date(item.startedAt).toISOString();
      item.updatedAt = new Date().toISOString();

      await insertItemIntoTable('how_long_to_beat_game', item, queryRunner);
    }

    for (const item of items) {
      item.createdAt = new Date(item.createdAt).toISOString();
      await insertItemIntoTable('how_long_to_beat_game_item', item, queryRunner);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    return;
  }
}
