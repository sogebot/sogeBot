import { MigrationInterface, QueryRunner } from 'typeorm';

import type { RandomizerItemInterface } from '../../../entity/randomizer';

export class randomizerItemOrderAttribute1594219451231 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    const items = await queryRunner.query(`SELECT * from randomizer_item`) as Required<RandomizerItemInterface>[];
    await queryRunner.query(`DROP TABLE "randomizer_item"`, undefined);
    await queryRunner.query(`CREATE TABLE "randomizer_item" ("id" varchar PRIMARY KEY NOT NULL, "randomizerId" varchar, "groupId" varchar, "name" varchar NOT NULL, "color" varchar(9), "numOfDuplicates" integer NOT NULL DEFAULT (1), "minimalSpacing" integer NOT NULL DEFAULT (1), "order" integer NOT NULL, CONSTRAINT "FK_f4505c5b831084d188f4d1aabc7" FOREIGN KEY ("randomizerId") REFERENCES "randomizer" ("id") ON DELETE CASCADE ON UPDATE CASCADE)`);

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
    const items = await queryRunner.query(`SELECT * from randomizer_item`) as Required<RandomizerItemInterface>[];
    await queryRunner.query(`DROP TABLE "randomizer_item"`, undefined);
    await queryRunner.query(`CREATE TABLE "randomizer_item" ("id" varchar PRIMARY KEY NOT NULL, "randomizerId" varchar, "groupId" varchar, "name" varchar NOT NULL, "color" varchar(9), "numOfDuplicates" integer NOT NULL DEFAULT (1), "minimalSpacing" integer NOT NULL DEFAULT (1))`, undefined);

    for (const item of items) {
      const { order, ...itemWithoutOrder } = item;
      await queryRunner.manager.getRepository('randomizer_item').insert(itemWithoutOrder);
    }
  }
}
