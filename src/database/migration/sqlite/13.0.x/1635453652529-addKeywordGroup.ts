import { MigrationInterface, QueryRunner } from 'typeorm';

export class addKeywordGroup1635453652529 implements MigrationInterface {
  name = 'addKeywordGroup1635453652529';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const responses = await queryRunner.query('SELECT * FROM keyword_responses', undefined);
    await queryRunner.query(`CREATE TABLE "temporary_keyword_responses" ("id" varchar PRIMARY KEY NOT NULL, "order" integer NOT NULL, "response" text NOT NULL, "stopIfExecuted" boolean NOT NULL, "permission" varchar NOT NULL, "filter" varchar NOT NULL, "keywordId" varchar, CONSTRAINT "FK_d12716a3805d58dd75ab09c8c67" FOREIGN KEY ("keywordId") REFERENCES "keyword" ("id") ON DELETE CASCADE ON UPDATE CASCADE)`);
    await queryRunner.query(`INSERT INTO "temporary_keyword_responses"("id", "order", "response", "stopIfExecuted", "permission", "filter", "keywordId") SELECT "id", "order", "response", "stopIfExecuted", "permission", "filter", "keywordId" FROM "keyword_responses"`);
    await queryRunner.query(`DROP TABLE "keyword_responses"`);
    await queryRunner.query(`ALTER TABLE "temporary_keyword_responses" RENAME TO "keyword_responses"`);
    await queryRunner.query(`CREATE TABLE "keyword_group" ("name" varchar PRIMARY KEY NOT NULL, "options" text NOT NULL)`);
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_keyword_group_unique_name" ON "keyword_group" ("name") `);
    await queryRunner.query(`DROP INDEX "IDX_35e3ff88225eef1d85c951e229"`);
    await queryRunner.query(`CREATE TABLE "temporary_keyword" ("id" varchar PRIMARY KEY NOT NULL, "keyword" varchar NOT NULL, "enabled" boolean NOT NULL, "group" varchar)`);
    await queryRunner.query(`INSERT INTO "temporary_keyword"("id", "keyword", "enabled") SELECT "id", "keyword", "enabled" FROM "keyword"`);
    await queryRunner.query(`DROP TABLE "keyword"`);
    await queryRunner.query(`ALTER TABLE "temporary_keyword" RENAME TO "keyword"`);
    await queryRunner.query(`CREATE INDEX "IDX_35e3ff88225eef1d85c951e229" ON "keyword" ("keyword") `);
    await queryRunner.query(`CREATE TABLE "temporary_keyword_responses" ("id" varchar PRIMARY KEY NOT NULL, "order" integer NOT NULL, "response" text NOT NULL, "stopIfExecuted" boolean NOT NULL, "permission" varchar, "filter" varchar NOT NULL, "keywordId" varchar, CONSTRAINT "FK_d12716a3805d58dd75ab09c8c67" FOREIGN KEY ("keywordId") REFERENCES "keyword" ("id") ON DELETE CASCADE ON UPDATE CASCADE)`);
    await queryRunner.query(`DROP TABLE "keyword_responses"`);
    await queryRunner.query(`ALTER TABLE "temporary_keyword_responses" RENAME TO "keyword_responses"`);
    for (const alert of responses) {
      const keys = Object.keys(alert);
      await queryRunner.query(
        `INSERT INTO "keyword_responses"(${keys.map(o => `"${o}"`).join(', ')}) values (${keys.map(o => `?`).join(', ')})`,
        [keys.map(key => alert[key])],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    return;
  }

}
