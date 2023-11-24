import { MigrationInterface, QueryRunner } from 'typeorm';

export class eventsUpdate1678892044036 implements MigrationInterface {
  name = 'eventsUpdate1678892044036';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_b535fbe8ec6d832dde22065ebd"`);
    await queryRunner.query(`DROP TABLE "event_operation"`);
    await queryRunner.query(`DROP TABLE "event"`);
    await queryRunner.query(`CREATE TABLE "event" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "isEnabled" boolean NOT NULL, "filter" character varying NOT NULL, "operations" json NOT NULL, "eventName" text NOT NULL, "eventTriggered" json NOT NULL, "eventDefinitions" json NOT NULL, CONSTRAINT "PK_30c2f3bbaf6d34a55f8ae6e4614" PRIMARY KEY ("id"))`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    return;
  }

}
