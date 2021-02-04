import { MigrationInterface, QueryRunner } from 'typeorm';

export class commandResponsesResponseToText1576758423496 implements MigrationInterface {
  name = 'commandResponsesResponseToText1576758423496';

  public async up(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(`CREATE TABLE "temporary_commands_responses" ("id" varchar PRIMARY KEY NOT NULL, "order" integer NOT NULL, "response" varchar NOT NULL, "stopIfExecuted" boolean NOT NULL, "permission" varchar NOT NULL, "filter" varchar NOT NULL, "commandId" varchar, CONSTRAINT "FK_09da90fa3264f486de9be57b185" FOREIGN KEY ("commandId") REFERENCES "commands" ("id") ON DELETE CASCADE ON UPDATE CASCADE)`, undefined);
    await queryRunner.query(`INSERT INTO "temporary_commands_responses"("id", "order", "response", "stopIfExecuted", "permission", "filter", "commandId") SELECT "id", "order", "response", "stopIfExecuted", "permission", "filter", "commandId" FROM "commands_responses"`, undefined);
    await queryRunner.query(`DROP TABLE "commands_responses"`, undefined);
    await queryRunner.query(`ALTER TABLE "temporary_commands_responses" RENAME TO "commands_responses"`, undefined);
    await queryRunner.query(`CREATE TABLE "temporary_commands_responses" ("id" varchar PRIMARY KEY NOT NULL, "order" integer NOT NULL, "response" text NOT NULL, "stopIfExecuted" boolean NOT NULL, "permission" varchar NOT NULL, "filter" varchar NOT NULL, "commandId" varchar, CONSTRAINT "FK_09da90fa3264f486de9be57b185" FOREIGN KEY ("commandId") REFERENCES "commands" ("id") ON DELETE CASCADE ON UPDATE CASCADE)`, undefined);
    await queryRunner.query(`INSERT INTO "temporary_commands_responses"("id", "order", "response", "stopIfExecuted", "permission", "filter", "commandId") SELECT "id", "order", "response", "stopIfExecuted", "permission", "filter", "commandId" FROM "commands_responses"`, undefined);
    await queryRunner.query(`DROP TABLE "commands_responses"`, undefined);
    await queryRunner.query(`ALTER TABLE "temporary_commands_responses" RENAME TO "commands_responses"`, undefined);
  }

  public async down(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(`ALTER TABLE "commands_responses" RENAME TO "temporary_commands_responses"`, undefined);
    await queryRunner.query(`CREATE TABLE "commands_responses" ("id" varchar PRIMARY KEY NOT NULL, "order" integer NOT NULL, "response" varchar NOT NULL, "stopIfExecuted" boolean NOT NULL, "permission" varchar NOT NULL, "filter" varchar NOT NULL, "commandId" varchar, CONSTRAINT "FK_09da90fa3264f486de9be57b185" FOREIGN KEY ("commandId") REFERENCES "commands" ("id") ON DELETE CASCADE ON UPDATE CASCADE)`, undefined);
    await queryRunner.query(`INSERT INTO "commands_responses"("id", "order", "response", "stopIfExecuted", "permission", "filter", "commandId") SELECT "id", "order", "response", "stopIfExecuted", "permission", "filter", "commandId" FROM "temporary_commands_responses"`, undefined);
    await queryRunner.query(`DROP TABLE "temporary_commands_responses"`, undefined);
    await queryRunner.query(`ALTER TABLE "commands_responses" RENAME TO "temporary_commands_responses"`, undefined);
    await queryRunner.query(`CREATE TABLE "commands_responses" ("id" varchar PRIMARY KEY NOT NULL, "order" integer NOT NULL, "response" varchar NOT NULL, "stopIfExecuted" boolean NOT NULL, "permission" varchar NOT NULL, "filter" varchar NOT NULL, "commandId" varchar, CONSTRAINT "FK_09da90fa3264f486de9be57b185" FOREIGN KEY ("commandId") REFERENCES "commands" ("id") ON DELETE CASCADE ON UPDATE CASCADE)`, undefined);
    await queryRunner.query(`INSERT INTO "commands_responses"("id", "order", "response", "stopIfExecuted", "permission", "filter", "commandId") SELECT "id", "order", "response", "stopIfExecuted", "permission", "filter", "commandId" FROM "temporary_commands_responses"`, undefined);
    await queryRunner.query(`DROP TABLE "temporary_commands_responses"`, undefined);
  }

}
