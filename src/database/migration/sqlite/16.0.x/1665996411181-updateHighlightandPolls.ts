import { MigrationInterface, QueryRunner } from 'typeorm';
import { insertItemIntoTable } from '~/database/insertItemIntoTable';

export class updateHighlightAndPolls1665996411181 implements MigrationInterface {
  name = 'updateHighlightAndPolls1665996411181';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const items = await queryRunner.query(`SELECT * from "highlight"`);
    const items2 = await queryRunner.query(`SELECT * from "poll"`);
    const items3 = await queryRunner.query(`SELECT * from "poll_vote"`);

    await queryRunner.query(`DROP TABLE "highlight"`);
    await queryRunner.query(`CREATE TABLE "highlight" ("id" varchar PRIMARY KEY NOT NULL, "videoId" varchar NOT NULL, "game" varchar NOT NULL, "title" varchar NOT NULL, "timestamp" text NOT NULL, "createdAt" varchar(30) NOT NULL, "expired" boolean NOT NULL DEFAULT (0))`);

    for (const item of items) {
      item.createdAt = new Date(item.createdAt).toISOString();
      await insertItemIntoTable('highlight', {
        ...item,
      }, queryRunner);
    }

    await queryRunner.query(`DROP TABLE "poll"`);
    await queryRunner.query(`CREATE TABLE "poll" ("id" varchar PRIMARY KEY NOT NULL, "type" varchar(7) NOT NULL, "title" varchar NOT NULL, "openedAt" varchar(30) NOT NULL, "closedAt" varchar(30), "options" text NOT NULL, "votes" text NOT NULL)`);

    for (const item of items2) {
      item.openedAt = new Date(item.openedAt).toISOString();
      item.closedAt = item.isOpened ? null : new Date(item.closedAt).toISOString();
      item.votes = JSON.stringify(items3.filter((o: any) => o.pollId === item.id));
      delete item.isOpened;
      await insertItemIntoTable('poll', {
        ...item,
      }, queryRunner);
    }

  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    return;
  }

}
