import { MigrationInterface, QueryRunner } from 'typeorm';

export class eventlistIsTestAttr1593591475193 implements MigrationInterface {
  name = 'eventlistIsTestAttr1593591475193';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const events = await queryRunner.query(`SELECT * from event_list`);

    await queryRunner.query(`DROP INDEX "IDX_8a80a3cf6b2d815920a390968a"`);
    await queryRunner.query(`DROP TABLE "event_list"`);

    await queryRunner.query(`CREATE TABLE "event_list" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "event" varchar NOT NULL, "username" varchar NOT NULL, "timestamp" bigint NOT NULL, "values_json" text NOT NULL, "isTest" boolean NOT NULL)`);
    await queryRunner.query(`CREATE INDEX "IDX_8a80a3cf6b2d815920a390968a" ON "event_list" ("username") `);

    for (const event of events) {
      await queryRunner.query(
        `INSERT INTO event_list(${Object.keys(event).join(', ')}, isTest) values(${Object.keys(event).map(o => '?')}, ?)`, [ ...Object.keys(event).map(key => event[key]), false ],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const events = await queryRunner.query(`SELECT * from event_list`);

    await queryRunner.query(`DROP INDEX "IDX_8a80a3cf6b2d815920a390968a"`);
    await queryRunner.query(`DROP TABLE "event_list"`);

    await queryRunner.query(`CREATE TABLE "event_list" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "event" varchar NOT NULL, "username" varchar NOT NULL, "timestamp" bigint NOT NULL, "values_json" text NOT NULL)`);
    await queryRunner.query(`CREATE INDEX "IDX_8a80a3cf6b2d815920a390968a" ON "event_list" ("username") `);

    for (const event of events) {
      await queryRunner.query(
        `INSERT INTO event_list(${Object.keys(event).filter(o => o !== 'isTest').join(', ')}, isTest) values(${Object.keys(event).map(o => '?')}, ?)`, [ ...Object.keys(event).filter(o => o !== 'isTest').map(key => event[key]) ],
      );
    }
  }

}
