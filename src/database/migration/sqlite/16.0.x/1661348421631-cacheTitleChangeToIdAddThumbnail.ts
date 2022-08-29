import { MigrationInterface, QueryRunner } from 'typeorm';

import { insertItemIntoTable } from '~/database/insertItemIntoTable';

export class cacheTitleChangeToIdAddThumbnail1661348421631 implements MigrationInterface {
  name = 'cacheTitleChangeToIdAddThumbnail1661348421631';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const items = await queryRunner.query(`SELECT * from "cache_games"`);
    const items2 = await queryRunner.query(`SELECT * from "cache_titles"`);
    await queryRunner.query(`DELETE from "cache_titles" WHERE 1=1`);
    await queryRunner.query(`DROP TABLE "cache_games"`);
    await queryRunner.query(`CREATE TABLE "cache_games" ("id" integer PRIMARY KEY NOT NULL, "name" varchar NOT NULL, "thumbnail" varchar)`);
    await queryRunner.query(`CREATE INDEX "IDX_f37be3c66dbd449a8cb4fe7d59" ON "cache_games" ("name") `);

    for (const title of items2) {
      const game = items.find((o: any) => o.name === title.game);
      if (game) {
        title.game = game.name;
        await insertItemIntoTable('cache_titles', {
          ...title,
        }, queryRunner);
      }
    }

    for (const item of items) {
      await insertItemIntoTable('cache_games', {
        ...item,
      }, queryRunner);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    return;
  }

}
