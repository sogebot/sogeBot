import { MigrationInterface, QueryRunner } from 'typeorm';

export class timersTickOffline1614604739140 implements MigrationInterface {
  name = 'timersTickOffline1614604739140';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const timer_response: any[] = await queryRunner.query(`SELECT * from "timer_response"`);
    await queryRunner.query(`CREATE TABLE "temporary_timer" ("id" varchar PRIMARY KEY NOT NULL, "name" varchar NOT NULL, "isEnabled" boolean NOT NULL, "triggerEveryMessage" integer NOT NULL, "triggerEverySecond" integer NOT NULL, "triggeredAtTimestamp" bigint NOT NULL DEFAULT (0), "triggeredAtMessages" bigint NOT NULL DEFAULT (0), "tickOffline" boolean NOT NULL DEFAULT (0))`);
    await queryRunner.query(`INSERT INTO "temporary_timer"("id", "name", "isEnabled", "triggerEveryMessage", "triggerEverySecond", "triggeredAtTimestamp", "triggeredAtMessages") SELECT "id", "name", "isEnabled", "triggerEveryMessage", "triggerEverySecond", "triggeredAtTimestamp", "triggeredAtMessages" FROM "timer"`);
    await queryRunner.query(`DROP TABLE "timer"`);
    await queryRunner.query(`ALTER TABLE "temporary_timer" RENAME TO "timer"`);

    for (const response of timer_response) {
      if (response.timerId) {
        await queryRunner.query(
          'INSERT INTO `timer_response`(`id`, `timestamp`, `isEnabled`, `response`, `timerId`) values(?, ?, ?, ?, ?)',
          [response.id, response.timestamp, response.isEnabled, response.response, response.timerId]);
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "timer" RENAME TO "temporary_timer"`);
    await queryRunner.query(`CREATE TABLE "timer" ("id" varchar PRIMARY KEY NOT NULL, "name" varchar NOT NULL, "isEnabled" boolean NOT NULL, "triggerEveryMessage" integer NOT NULL, "triggerEverySecond" integer NOT NULL, "triggeredAtTimestamp" bigint NOT NULL DEFAULT (0), "triggeredAtMessages" bigint NOT NULL DEFAULT (0))`);
    await queryRunner.query(`INSERT INTO "timer"("id", "name", "isEnabled", "triggerEveryMessage", "triggerEverySecond", "triggeredAtTimestamp", "triggeredAtMessages") SELECT "id", "name", "isEnabled", "triggerEveryMessage", "triggerEverySecond", "triggeredAtTimestamp", "triggeredAtMessages" FROM "temporary_timer"`);
    await queryRunner.query(`DROP TABLE "temporary_timer"`);
  }

}
