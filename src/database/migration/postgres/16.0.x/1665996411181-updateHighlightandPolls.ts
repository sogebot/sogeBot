import { MigrationInterface, QueryRunner } from 'typeorm';
import { insertItemIntoTable } from '~/database/insertItemIntoTable';

export class updateHighlightAndPolls1665996411181 implements MigrationInterface {
  name = 'updateHighlightAndPolls1665996411181';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const items = await queryRunner.query(`SELECT * from "highlight"`);
    const items2 = await queryRunner.query(`SELECT * from "poll"`);
    const items3 = await queryRunner.query(`SELECT * from "poll_vote"`);

    await queryRunner.query(`DELETE from "poll" WHERE 1=1`);
    await queryRunner.query(`DELETE from "poll_vote" WHERE 1=1`);
    await queryRunner.query(`DELETE from "highlight" WHERE 1=1`);

    await queryRunner.query(`DROP TABLE "poll_vote"`);
    await queryRunner.query(`DROP TABLE "poll"`);

    await queryRunner.query(`ALTER TABLE "highlight" DROP COLUMN "timestamp"`);
    await queryRunner.query(`ALTER TABLE "highlight" ADD "timestamp" json NOT NULL`);
    await queryRunner.query(`ALTER TABLE "highlight" DROP COLUMN "createdAt"`);
    await queryRunner.query(`ALTER TABLE "highlight" ADD "createdAt" character varying(30) NOT NULL`);

    await queryRunner.query(`CREATE TABLE "poll" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "type" character varying(7) NOT NULL, "title" character varying NOT NULL, "openedAt" TIMESTAMP NOT NULL DEFAULT now(), "closedAt" TIMESTAMP, "options" text NOT NULL, "votes" json NOT NULL, CONSTRAINT "PK_03b5cf19a7f562b231c3458527e" PRIMARY KEY ("id"))`);
    await queryRunner.query(`ALTER TABLE "poll" DROP COLUMN "openedAt"`);
    await queryRunner.query(`ALTER TABLE "poll" ADD "openedAt" character varying(30) NOT NULL`);
    await queryRunner.query(`ALTER TABLE "poll" DROP COLUMN "closedAt"`);
    await queryRunner.query(`ALTER TABLE "poll" ADD "closedAt" character varying(30)`);

    for (const item of items) {
      item.createdAt = new Date(item.createdAt).toISOString();
      await insertItemIntoTable('highlight', {
        ...item,
      }, queryRunner);
    }

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
