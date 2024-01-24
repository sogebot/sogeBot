import { MigrationInterface, QueryRunner } from 'typeorm';

export class alertsQueue1678892044039 implements MigrationInterface {
  name = 'alertsQueue1678892044039';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "alert_queue" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "emitData" json NOT NULL, "filter" json, "passthrough" boolean NOT NULL, "play" boolean NOT NULL, "updatedAt" character varying(30) NOT NULL, CONSTRAINT "PK_81342c2e2eddba1575f7a475494" PRIMARY KEY ("id"))`);
    return;
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    return;
  }

}
