import { MigrationInterface, QueryRunner } from 'typeorm';

export class removeGivenNameEvents1605015996687 implements MigrationInterface {
  name = 'removeGivenNameEvents1605015996687';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const events = await queryRunner.query(`SELECT * from "event"`);
    const event_operation = await queryRunner.query(`SELECT * from "event_operation"`);
    await queryRunner.query(`DROP INDEX "IDX_b535fbe8ec6d832dde22065ebd"`);
    await queryRunner.query(`DELETE FROM "event_operation" WHERE 1=1`);
    await queryRunner.query(`DROP TABLE "event"`);
    await queryRunner.query(`CREATE TABLE "event" ("id" varchar PRIMARY KEY NOT NULL, "name" varchar NOT NULL, "isEnabled" boolean NOT NULL, "triggered" text NOT NULL, "definitions" text NOT NULL, "filter" varchar NOT NULL)`);
    await queryRunner.query(`CREATE INDEX "IDX_b535fbe8ec6d832dde22065ebd" ON "event" ("name") `);

    for (const event of events) {
      delete event.givenName;
      const keys = Object.keys(event);
      await queryRunner.query(
        `INSERT INTO "event"(${keys.map(o => `"${o}"`).join(', ')}) values (${keys.map(o => `?`).join(', ')})`,
        [keys.map(key => event[key])],
      );
    }
    // resave operations
    for (const operation of event_operation) {
      const keys = Object.keys(operation);
      await queryRunner.query(
        `INSERT INTO "event_operation"(${keys.map(o => `"${o}"`).join(', ')}) values (${keys.map(o => `?`).join(', ')})`,
        [keys.map(key => operation[key])],
      );
    }

  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const events = await queryRunner.query(`SELECT * from "event"`);
    const event_operation = await queryRunner.query(`SELECT * from "event_operation"`);
    await queryRunner.query(`DROP INDEX "IDX_b535fbe8ec6d832dde22065ebd"`);
    await queryRunner.query(`DELETE FROM "event_operation" WHERE 1=1`);
    await queryRunner.query(`DROP TABLE "event"`);
    await queryRunner.query(`CREATE TABLE "event" ("id" varchar PRIMARY KEY NOT NULL, "givenName" varchar NOT NULL, "name" varchar NOT NULL, "isEnabled" boolean NOT NULL, "triggered" text NOT NULL, "definitions" text NOT NULL, "filter" varchar NOT NULL)`);
    await queryRunner.query(`CREATE INDEX "IDX_b535fbe8ec6d832dde22065ebd" ON "event" ("name") `);
    for (const event of events) {
      await queryRunner.query(
        `INSERT INTO "event"("id", "name", "givenName", "isEnabled", "triggered", "definitions", "filter") values (?, ?, ?, ?, ?, ?, ?)`,
        [event.id, event.name, Math.random().toString(36).replace(/[^a-z]+/g, '').substr(0, 5), event.isEnabled, event.triggered, event.definitions, event.filter],
      );
    }
    // resave operations
    for (const operation of event_operation) {
      const keys = Object.keys(operation);
      await queryRunner.query(
        `INSERT INTO "event_operation"(${keys.map(o => `"${o}"`).join(', ')}) values (${keys.map(o => `?`).join(', ')})`,
        [keys.map(key => operation[key])],
      );
    }

  }

}
