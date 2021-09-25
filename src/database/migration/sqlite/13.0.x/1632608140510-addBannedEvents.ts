import { MigrationInterface, QueryRunner } from 'typeorm';

export class addBannedEvents1632608140510 implements MigrationInterface {
  name = 'addBannedEvents1632608140510';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "banned_events" ("id" varchar PRIMARY KEY NOT NULL, "event_type" varchar NOT NULL, "event_timestamp" varchar NOT NULL, "version" varchar NOT NULL, "event_data" text NOT NULL)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "banned_events"`);
  }

}
