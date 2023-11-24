import { MigrationInterface, QueryRunner } from 'typeorm';

export class eventsUpdate1678892044036 implements MigrationInterface {
  name = 'eventsUpdate1678892044036';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_b535fbe8ec6d832dde22065ebd"`);
    await queryRunner.query(`DROP TABLE "event"`);
    await queryRunner.query(`DROP TABLE "event_operation"`);
    await queryRunner.query(`CREATE TABLE "event" ("id" varchar PRIMARY KEY NOT NULL, "isEnabled" boolean NOT NULL, "filter" varchar NOT NULL, "operations" text NOT NULL, "eventName" text NOT NULL, "eventTriggered" text NOT NULL, "eventDefinitions" text NOT NULL)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    return;
  }

}
