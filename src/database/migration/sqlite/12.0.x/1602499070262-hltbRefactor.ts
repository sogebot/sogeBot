import { MigrationInterface, QueryRunner } from 'typeorm';

export class hltbRefactor1602499070262 implements MigrationInterface {
  name = 'hltbRefactor1602499070262';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "how_long_to_beat_game_item" ("id" varchar PRIMARY KEY NOT NULL, "hltb_id" integer NOT NULL, "createdAt" bigint NOT NULL, "timestamp" bigint NOT NULL DEFAULT (0), "offset" bigint NOT NULL DEFAULT (0), "isMainCounted" boolean NOT NULL DEFAULT (0), "isExtraCounted" boolean NOT NULL DEFAULT (0), "isCompletionistCounted" boolean NOT NULL DEFAULT (0))`);
    await queryRunner.query(`CREATE INDEX "IDX_hltb_id" ON "how_long_to_beat_game_item" ("hltb_id") `);
    await queryRunner.query(`DROP INDEX "IDX_301758e0e3108fc902d5436527"`);
    await queryRunner.query(`DROP TABLE "how_long_to_beat_game"`);
    await queryRunner.query(`CREATE TABLE "how_long_to_beat_game" ("id" varchar PRIMARY KEY NOT NULL, "game" varchar NOT NULL, "startedAt" bigint NOT NULL, "gameplayMain" float NOT NULL DEFAULT (0), "gameplayCompletionist" float NOT NULL DEFAULT (0), "gameplayMainExtra" float NOT NULL DEFAULT (0), "imageUrl" varchar NOT NULL, "offset" bigint NOT NULL DEFAULT (0))`);
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_301758e0e3108fc902d5436527" ON "how_long_to_beat_game" ("game") `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_301758e0e3108fc902d5436527"`);
    await queryRunner.query(`DROP INDEX "IDX_hltb_id"`);
    await queryRunner.query(`DROP TABLE "how_long_to_beat_game_item"`);
    await queryRunner.query(`DROP TABLE "how_long_to_beat_game"`);
    await queryRunner.query(`CREATE TABLE "how_long_to_beat_game" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "game" varchar NOT NULL, "startedAt" bigint NOT NULL DEFAULT (0), "gameplayMain" float NOT NULL DEFAULT (0), "gameplayCompletionist" float NOT NULL DEFAULT (0), "imageUrl" varchar NOT NULL)`);
  }

}
