import { MigrationInterface, QueryRunner } from 'typeorm';

import { insertItemIntoTable } from '~/database/insertItemIntoTable';

export class timerAttrChange1661765436386 implements MigrationInterface {
  name = 'timerAttrChange1661765436386';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const items = await queryRunner.query(`SELECT * from "timer"`);
    const items2 = await queryRunner.query(`SELECT * from "timer_response"`);
    await queryRunner.query(`DELETE from "timer_response" WHERE 1=1`);
    await queryRunner.query(`DELETE from "timer" WHERE 1=1`);

    await queryRunner.query(`DROP TABLE "timer_response"`);
    await queryRunner.query(`DROP TABLE "timer"`);

    await queryRunner.query(`CREATE TABLE "timer" ("id" varchar PRIMARY KEY NOT NULL, "name" varchar NOT NULL, "isEnabled" boolean NOT NULL, "tickOffline" boolean NOT NULL DEFAULT (0), "triggerEveryMessage" integer NOT NULL, "triggerEverySecond" integer NOT NULL, "triggeredAtTimestamp" varchar(30) NOT NULL DEFAULT ('1970-01-01T00:00:00.000Z'), "triggeredAtMessages" integer NOT NULL DEFAULT (0))`);
    await queryRunner.query(`CREATE TABLE "timer_response" ("id" varchar PRIMARY KEY NOT NULL, "timestamp" varchar(30) NOT NULL DEFAULT ('1970-01-01T00:00:00.000Z'), "isEnabled" boolean NOT NULL DEFAULT (1), "response" text NOT NULL, "timerId" varchar, CONSTRAINT "FK_3192b176b66d4375368c9e960de" FOREIGN KEY ("timerId") REFERENCES "timer" ("id") ON DELETE CASCADE ON UPDATE CASCADE)`);

    for (const item of items) {
      await insertItemIntoTable('timer', {
        ...item,
        triggeredAtTimestamp: new Date(item.triggeredAtTimestamp).toISOString(),
      }, queryRunner);
    }

    for (const item of items2) {
      await insertItemIntoTable('timer_response', {
        ...item,
        timestamp: new Date(item.timestamp).toISOString(),
      }, queryRunner);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    return;
  }

}