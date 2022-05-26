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

    await queryRunner.query(`CREATE TABLE "how_long_to_beat_game" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "game" character varying NOT NULL, "startedAt" character varying NOT NULL, "updatedAt" character varying NOT NULL, "offset" bigint NOT NULL DEFAULT '0', "gameplayMain" double precision NOT NULL DEFAULT '0', "gameplayMainExtra" double precision NOT NULL DEFAULT '0', "gameplayCompletionist" double precision NOT NULL DEFAULT '0', CONSTRAINT "PK_c6fbf5fc15e97e46c2659dccea1" PRIMARY KEY ("id"))`);
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_301758e0e3108fc902d5436527" ON "how_long_to_beat_game" ("game") `);
    await queryRunner.query(`CREATE TABLE "how_long_to_beat_game_item" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "hltb_id" uuid NOT NULL, "createdAt" character varying NOT NULL, "timestamp" bigint NOT NULL DEFAULT '0', "offset" bigint NOT NULL DEFAULT '0', "isMainCounted" boolean NOT NULL DEFAULT false, "isCompletionistCounted" boolean NOT NULL DEFAULT false, "isExtraCounted" boolean NOT NULL DEFAULT false, CONSTRAINT "PK_920cb816276ba242619a4f40326" PRIMARY KEY ("id"))`);
    await queryRunner.query(`CREATE INDEX "IDX_hltb_id" ON "how_long_to_beat_game_item" ("hltb_id") `);

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
