import { MigrationInterface, QueryRunner } from 'typeorm';
// import { insertItemIntoTable } from '~/database/insertItemIntoTable';

export class updatePollTable1665480646971 implements MigrationInterface {
  name = 'updatePollTable1665480646971';

  public async up(queryRunner: QueryRunner): Promise<void> {
    /* const items = await queryRunner.query(`SELECT * from "poll"`);
    const items2 = await queryRunner.query(`SELECT * from "poll_vote"`); */

    await queryRunner.query(`DELETE from "poll" WHERE 1=1`);
    await queryRunner.query(`DELETE from "poll_vote" WHERE 1=1`);

    await queryRunner.query(`DROP TABLE "poll"`);
    /* await queryRunner.query(`CREATE TABLE "poll" ("id" varchar PRIMARY KEY NOT NULL, "type" varchar(7) NOT NULL, "title" varchar NOT NULL, "openedAt" datetime NOT NULL DEFAULT (datetime('now')), "closedAt" date, "options" text NOT NULL)`);

    for (const item of items) {
      item.openedAt = new Date(item.openedAt).getTime();
      item.closedAt = item.isOpened ? null : new Date(item.closedAt).getTime();
      delete item.isOpened;
      await insertItemIntoTable('poll', {
        ...item,
      }, queryRunner);
    }

    for (const item of items2) {
      await insertItemIntoTable('poll_vote', {
        ...item,
      }, queryRunner);
    }
    */

  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    return;
  }

}
