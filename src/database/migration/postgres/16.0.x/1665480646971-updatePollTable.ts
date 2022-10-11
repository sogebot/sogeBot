import { MigrationInterface, QueryRunner } from 'typeorm';
// import { insertItemIntoTable } from '~/database/insertItemIntoTable';

export class updatePollTable1665480646971 implements MigrationInterface {
  name = 'updatePollTable1665480646971';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // const items = await queryRunner.query(`SELECT * from "poll"`);
    // const items2 = await queryRunner.query(`SELECT * from "poll_vote"`);

    await queryRunner.query(`DELETE from "poll" WHERE 1=1`);
    await queryRunner.query(`DELETE from "poll_vote" WHERE 1=1`);

    await queryRunner.query(`DROP TABLE "poll_vote"`);
    await queryRunner.query(`DROP TABLE "poll"`);

    await queryRunner.query(`CREATE TABLE "poll" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "type" character varying(7) NOT NULL, "title" character varying NOT NULL, "openedAt" TIMESTAMP NOT NULL DEFAULT now(), "closedAt" date, "options" text NOT NULL, CONSTRAINT "PK_03b5cf19a7f562b231c3458527e" PRIMARY KEY ("id"))`);
    /*await queryRunner.query(`CREATE TABLE "poll_vote" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "option" integer NOT NULL, "votes" integer NOT NULL, "votedBy" character varying NOT NULL, "pollId" character varying, CONSTRAINT "PK_fd002d371201c472490ba89c6a0" PRIMARY KEY ("id"))`);
    await queryRunner.query(`ALTER TABLE "poll_vote" ADD CONSTRAINT "FK_99f9db6d3dae2a0aebebbf8e10a" FOREIGN KEY ("pollId") REFERENCES "poll"("id") ON DELETE CASCADE ON UPDATE CASCADE`);

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
    }*/
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    return;
  }

}
