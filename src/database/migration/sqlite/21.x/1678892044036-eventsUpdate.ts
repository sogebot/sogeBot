import { MigrationInterface, QueryRunner } from 'typeorm';

import { insertItemIntoTable } from '../../../insertItemIntoTable.js';

export class eventsUpdate1678892044036 implements MigrationInterface {
  name = 'eventsUpdate1678892044036';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const operations  = await queryRunner.query(`SELECT * FROM "event_operation"`);
    const events = await queryRunner.query(`SELECT * FROM "event"`);
    await queryRunner.query(`DROP INDEX "IDX_b535fbe8ec6d832dde22065ebd"`);
    await queryRunner.query(`DROP TABLE "event_operation"`);
    await queryRunner.query(`DROP TABLE "event"`);
    await queryRunner.query(`CREATE TABLE "event" ("id" varchar PRIMARY KEY NOT NULL, "isEnabled" boolean NOT NULL, "filter" varchar NOT NULL, "operations" text NOT NULL, "eventName" text NOT NULL, "eventTriggered" text NOT NULL, "eventDefinitions" text NOT NULL)`);

    for (const event of events) {
      const eventOperation = operations.filter((operation: any) => operation.eventId === event.id);
      event.operations = JSON.stringify(eventOperation ?? []);
      event.eventTriggered = JSON.stringify({});
      event.eventDefinitions = event.definitions;
      event.eventName = event.name;
      delete event.triggered;
      delete event.definitions;
      delete event.name;
      await insertItemIntoTable('event', event, queryRunner);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    return;
  }

}
