import { MigrationInterface, QueryRunner } from 'typeorm';
import { v4 as uuid } from 'uuid';

export class keywordMultipleResponses1602413333619 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    // we need to get responses and insert them in new table
    const keywords = await queryRunner.query(`SELECT * from "keyword"`);

    await queryRunner.query(`ALTER TABLE "keyword" DROP COLUMN "response"`);
    await queryRunner.query(`CREATE TABLE "keyword_responses" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "order" integer NOT NULL, "response" text NOT NULL, "stopIfExecuted" boolean NOT NULL, "permission" character varying NOT NULL, "filter" character varying NOT NULL, "keywordId" uuid, CONSTRAINT "PK_3049091cd170cc88ad38bcca63f" PRIMARY KEY ("id"))`, undefined);
    await queryRunner.query(`ALTER TABLE "keyword_responses" ADD CONSTRAINT "FK_d12716a3805d58dd75ab09c8c67" FOREIGN KEY ("keywordId") REFERENCES "keyword"("id") ON DELETE CASCADE ON UPDATE CASCADE`);

    for (const keyword of keywords) {
      await queryRunner.query(
        `INSERT INTO "keyword_responses"("id", "order", "response", "stopIfExecuted", "permission", "filter", "keywordId") values("${uuid()}", 0, "${keyword.response}", 0, "0efd7b1c-e460-4167-8e06-8aaf2c170311", "", "${keyword.id}")`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    throw new Error('Revert your database from backup');
  }

}
