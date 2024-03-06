import { MigrationInterface, QueryRunner } from 'typeorm';

import { insertItemIntoTable } from '../../../insertItemIntoTable.js';

export class changeKeywordsResponses1678892044040 implements MigrationInterface {
  name = 'changeKeywordsResponses1678892044040';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const items = await queryRunner.query(`SELECT * from "keyword"`);
    const items2 = await queryRunner.query(`SELECT * from "keyword_responses"`);

    await queryRunner.query(`DELETE from "keyword_responses" WHERE 1=1`);
    await queryRunner.query(`DELETE from "keyword" WHERE 1=1`);

    await queryRunner.query(`DROP TABLE "keyword_responses"`);
    await queryRunner.query(`DROP TABLE "keyword"`);

    await queryRunner.query(`CREATE TABLE "keyword" ("id" varchar PRIMARY KEY NOT NULL, "areResponsesRandomized" boolean NOT NULL DEFAULT (0), "keyword" varchar NOT NULL, "enabled" boolean NOT NULL, "group" varchar, "responses" text NOT NULL)`);
    await queryRunner.query(`CREATE INDEX "IDX_35e3ff88225eef1d85c951e229" ON "keyword" ("keyword") `);

    for (const item of items) {
      item.responses = JSON.stringify(items2.filter((o: any) => o.keywordId === item.id));
      await insertItemIntoTable('keyword', {
        ...item,
      }, queryRunner);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    return;
  }

}
