import { MigrationInterface, QueryRunner } from 'typeorm';

export class addBannedEvents1632608140510 implements MigrationInterface {
  name = 'addBannedEvents1632608140510';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "banned_events" ("id" character varying NOT NULL, "event_type" character varying NOT NULL, "event_timestamp" character varying NOT NULL, "version" character varying NOT NULL, "event_data" text NOT NULL, CONSTRAINT "PK_cc2b66bacef7eec90ed5ce5337b" PRIMARY KEY ("id"))`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "banned_events"`);
  }

}
