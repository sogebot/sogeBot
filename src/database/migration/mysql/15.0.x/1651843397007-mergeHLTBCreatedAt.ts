import { MigrationInterface, QueryRunner } from 'typeorm';

import { insertItemIntoTable } from '~/database/insertItemIntoTable';

export class mergeHLTBCreatedAt1651843397007 implements MigrationInterface {
  name = 'mergeHLTBCreatedAt1651843397007';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const items = await queryRunner.query(`SELECT * from "how_long_to_beat_game_item"`);
    const map = new Map();

    for(const item of items) {
      if (map.get(item.createdAt)) {
        const mapItem = map.get(item.createdAt);
        item.timestamp += mapItem.timestamp;
      }
      map.set(item.createdAt, item);
    }

    await queryRunner.query(`DELETE FROM "how_long_to_beat_game_item" WHERE 1=1`);
    for(const item of map.values()) {
      await insertItemIntoTable('how_long_to_beat_game_item', item, queryRunner);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    return;
  }
}
