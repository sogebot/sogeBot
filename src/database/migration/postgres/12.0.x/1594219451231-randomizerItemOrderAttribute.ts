import { MigrationInterface, QueryRunner } from 'typeorm';

import type { RandomizerItemInterface } from '../../../entity/randomizer';

export class randomizerItemOrderAttribute1594219451231 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    const items = await queryRunner.query(`SELECT * from "randomizer_item"`) as Required<RandomizerItemInterface>[];

    await queryRunner.query('DELETE FROM "randomizer_item" WHERE 1=1');
    await queryRunner.query(`ALTER TABLE "randomizer_item" ADD "order" integer NOT NULL`, undefined);

    const mapByRandomizerId = new Map() as Map<string, RandomizerItemInterface[]>;
    for (const item of items) {
      const randomizerId = item.randomizerId as string;
      const mappedItems = mapByRandomizerId.get(randomizerId);
      if (mappedItems) {
        mappedItems.push({ ...item, order: mappedItems.length });
        mapByRandomizerId.set(randomizerId, mappedItems);
      } else {
        mapByRandomizerId.set(randomizerId, [{ ...item, order: 0 }]);
      }
    }
    for (const randomizer of mapByRandomizerId.keys()) {
      for (const item of mapByRandomizerId.get(randomizer) ?? []) {
        await queryRunner.manager.getRepository('randomizer_item').insert(item);
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "randomizer_item" DROP COLUMN "order"`, undefined);
  }
}
