import { MigrationInterface, QueryRunner } from 'typeorm';
import { insertItemIntoTable } from '~/database/insertItemIntoTable';

export class updateHLTB1665996411181 implements MigrationInterface {
  name = 'updateHLTB1665996411181';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const items = await queryRunner.query(`SELECT * from "how_long_to_beat_game"`);
    const items2 = await queryRunner.query(`SELECT * from "how_long_to_beat_game_item"`);

    await queryRunner.query(`DROP TABLE "how_long_to_beat_game"`);
    await queryRunner.query(`DROP TABLE "how_long_to_beat_game_item"`);

    await queryRunner.query(`DROP TABLE "thread_event"`);

    await queryRunner.query(`CREATE TABLE "how_long_to_beat_game" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "game" character varying NOT NULL, "startedAt" character varying(30) NOT NULL, "updatedAt" character varying(30) NOT NULL, "gameplayMain" double precision NOT NULL DEFAULT '0', "gameplayMainExtra" double precision NOT NULL DEFAULT '0', "gameplayCompletionist" double precision NOT NULL DEFAULT '0', "offset" bigint NOT NULL DEFAULT '0', "streams" json NOT NULL, CONSTRAINT "PK_c6fbf5fc15e97e46c2659dccea1" PRIMARY KEY ("id"))`);
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_301758e0e3108fc902d5436527" ON "how_long_to_beat_game" ("game") `);

    for (const item of items) {
      item.streams = JSON.stringify(items2.filter((o: any) => o.hltb_id === item.id));
      await insertItemIntoTable('how_long_to_beat_game', {
        ...item,
      }, queryRunner);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    return;
  }

}
