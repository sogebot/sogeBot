import { MigrationInterface, QueryRunner } from 'typeorm';

import { insertItemIntoTable } from '~/database/insertItemIntoTable.js';

export class addContentClasificationLabels1678892044034 implements MigrationInterface {
  name = 'addContentClasificationLabels1678892044034';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const items = await queryRunner.query(`SELECT * from "cache_titles"`);
    await queryRunner.query(`DROP INDEX "IDX_a0c6ce833b5b3b13325e6f49b0"`);
    await queryRunner.query(`DROP TABLE "cache_titles"`);
    await queryRunner.query(`CREATE TABLE "cache_titles" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "game" varchar NOT NULL, "title" varchar NOT NULL, "timestamp" bigint NOT NULL, "tags" text NOT NULL, "content_classification_labels" text NOT NULL)`);
    await queryRunner.query(`CREATE INDEX "IDX_a0c6ce833b5b3b13325e6f49b0" ON "cache_titles" ("game") `);

    for (const item of items) {
      await insertItemIntoTable('cache_titles', {
        ...item,
        content_classification_labels: '',
      }, queryRunner);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    return;
  }

}
