import { MigrationInterface, QueryRunner } from 'typeorm';

export class alertsQueue1678892044039 implements MigrationInterface {
  name = 'alertsQueue1678892044039';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "alert_queue" ("id" varchar PRIMARY KEY NOT NULL, "emitData" text NOT NULL, "filter" text, "passthrough" boolean NOT NULL, "play" boolean NOT NULL, "updatedAt" varchar(30) NOT NULL)`);
    return;
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    return;
  }

}
