import { MigrationInterface, QueryRunner } from 'typeorm';

export class hltbRefactor1602499070262 implements MigrationInterface {
  name = 'hltbRefactor1602499070262';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "how_long_to_beat_game"`, undefined);
    await queryRunner.query(`CREATE TABLE "how_long_to_beat_game_item" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "hltb_id" integer NOT NULL, "createdAt" bigint NOT NULL, "timestamp" bigint NOT NULL DEFAULT 0, "offset" bigint NOT NULL DEFAULT 0, "isMainCounted" boolean NOT NULL DEFAULT false, "isCompletionistCounted" boolean NOT NULL DEFAULT false, CONSTRAINT "PK_920cb816276ba242619a4f40326" PRIMARY KEY ("id"))`);
    await queryRunner.query(`CREATE TABLE "how_long_to_beat_game" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "game" character varying NOT NULL, "startedAt" bigint NOT NULL, "gameplayMain" double precision NOT NULL DEFAULT 0, "gameplayCompletionist" double precision NOT NULL DEFAULT 0, "imageUrl" character varying NOT NULL, CONSTRAINT "PK_c6fbf5fc15e97e46c2659dccea1" PRIMARY KEY ("id"))`, undefined);
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_301758e0e3108fc902d5436527" ON "how_long_to_beat_game" ("game") `, undefined);
    await queryRunner.query(`CREATE INDEX "IDX_hltb_id" ON "how_long_to_beat_game_item" ("hltb_id") `);
    await queryRunner.query(`ALTER TABLE "how_long_to_beat_game" ADD "gameplayMainExtra" double precision NOT NULL DEFAULT 0`);
    await queryRunner.query(`ALTER TABLE "how_long_to_beat_game_item" ADD "isExtraCounted" boolean NOT NULL DEFAULT false`);
    await queryRunner.query(`ALTER TABLE "how_long_to_beat_game" ADD "offset" bigint NOT NULL DEFAULT 0`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_301758e0e3108fc902d5436527"`);
    await queryRunner.query(`DROP INDEX "IDX_hltb_id"`);
    await queryRunner.query(`DROP TABLE "how_long_to_beat_game_item"`);
    await queryRunner.query(`DROP TABLE "how_long_to_beat_game"`);
    await queryRunner.query(`CREATE TABLE "how_long_to_beat_game" ("id" SERIAL NOT NULL, "game" character varying NOT NULL, "startedAt" bigint NOT NULL DEFAULT 0, "isFinishedMain" boolean NOT NULL, "isFinishedCompletionist" boolean NOT NULL, "timeToBeatMain" bigint NOT NULL DEFAULT 0, "timeToBeatCompletionist" bigint NOT NULL DEFAULT 0, "gameplayMain" double precision NOT NULL DEFAULT 0, "gameplayCompletionist" double precision NOT NULL DEFAULT 0, "imageUrl" character varying NOT NULL, CONSTRAINT "PK_c6fbf5fc15e97e46c2659dccea1" PRIMARY KEY ("id"))`, undefined);
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_301758e0e3108fc902d5436527" ON "how_long_to_beat_game" ("game") `, undefined);
  }

}
