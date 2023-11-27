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
    await queryRunner.query(`CREATE TABLE "event" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "isEnabled" boolean NOT NULL, "filter" character varying NOT NULL, "operations" json NOT NULL, "eventName" text NOT NULL, "eventTriggered" json NOT NULL, "eventDefinitions" json NOT NULL, CONSTRAINT "PK_30c2f3bbaf6d34a55f8ae6e4614" PRIMARY KEY ("id"))`);

    for (const event of events) {
      const eventOperation = operations.filter((operation: any) => operation.eventId === event.id);
      eventOperation.forEach((operation: any) => {
        operation.definitions = JSON.parse(operation.definitions);
        if ('numberToDecrement' in operation.definitions) {
          operation.definitions.numberToDecrement = Number(operation.definitions.numberToDecrement);
        }
        if ('numberToIncrement' in operation.definitions) {
          operation.definitions.numberToIncrement = Number(operation.definitions.numberToIncrement);
        }
      });
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
