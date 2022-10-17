import { MigrationInterface, QueryRunner } from 'typeorm';
import { insertItemIntoTable } from '~/database/insertItemIntoTable';

export class updateHighlightAndPolls1665996411181 implements MigrationInterface {
  name = 'updateHighlightAndPolls1665996411181';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const items = await queryRunner.query(`SELECT * from "highlight"`);
    const items2 = await queryRunner.query(`SELECT * from "poll"`);

    await queryRunner.query(`ALTER TABLE "highlight" DROP COLUMN "timestamp"`);
    await queryRunner.query(`ALTER TABLE "highlight" ADD "timestamp" json NOT NULL`);
    await queryRunner.query(`ALTER TABLE "highlight" DROP COLUMN "createdAt"`);
    await queryRunner.query(`ALTER TABLE "highlight" ADD "createdAt" character varying(30) NOT NULL`);
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
