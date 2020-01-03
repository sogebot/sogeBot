import {MigrationInterface, QueryRunner} from 'typeorm';

export class variableSchemaUpdate1578015160127 implements MigrationInterface {
  name = 'variableSchemaUpdate1578015160127';

  public async up(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(`CREATE TABLE "temporary_variable_history" ("id" varchar PRIMARY KEY NOT NULL, "userId" integer NOT NULL DEFAULT (0), "username" varchar NOT NULL DEFAULT ('n/a'), "currentValue" varchar NOT NULL, "oldValue" text NOT NULL, "changedAt" bigint NOT NULL DEFAULT (0), "variableId" varchar, CONSTRAINT "FK_94d39c77652e9c332751a0cee02" FOREIGN KEY ("variableId") REFERENCES "variable" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION)`, undefined);
    await queryRunner.query(`INSERT INTO "temporary_variable_history"("id", "userId", "username", "currentValue", "oldValue", "changedAt", "variableId") SELECT "id", "userId", "username", "currentValue", "oldValue", "changedAt", "variableId" FROM "variable_history"`, undefined);
    await queryRunner.query(`DROP TABLE "variable_history"`, undefined);
    await queryRunner.query(`ALTER TABLE "temporary_variable_history" RENAME TO "variable_history"`, undefined);
    await queryRunner.query(`CREATE TABLE "temporary_variable_watch" ("id" varchar PRIMARY KEY NOT NULL, "variableId" varchar NOT NULL, "order" integer NOT NULL)`, undefined);
    await queryRunner.query(`INSERT INTO "temporary_variable_watch"("id", "variableId", "order") SELECT "id", "variableId", "order" FROM "variable_watch"`, undefined);
    await queryRunner.query(`DROP TABLE "variable_watch"`, undefined);
    await queryRunner.query(`ALTER TABLE "temporary_variable_watch" RENAME TO "variable_watch"`, undefined);
    await queryRunner.query(`CREATE TABLE "temporary_variable" ("id" varchar PRIMARY KEY NOT NULL, "variableName" varchar NOT NULL, "description" varchar NOT NULL DEFAULT (''), "type" varchar NOT NULL, "currentValue" varchar, "evalValue" text NOT NULL, "runEveryTypeValue" integer NOT NULL DEFAULT (60000), "runEveryType" varchar NOT NULL DEFAULT ('isUsed'), "runEvery" integer NOT NULL DEFAULT (60000), "responseType" integer NOT NULL, "responseText" varchar NOT NULL DEFAULT (''), "permission" varchar NOT NULL, "readOnly" boolean NOT NULL DEFAULT (0), "usableOptions" text NOT NULL, "runAt" bigint NOT NULL DEFAULT (0))`, undefined);
    await queryRunner.query(`INSERT INTO "temporary_variable"("id", "variableName", "description", "type", "currentValue", "evalValue", "runEveryTypeValue", "runEveryType", "runEvery", "responseType", "responseText", "permission", "readOnly", "usableOptions", "runAt") SELECT "id", "variableName", "description", "type", "currentValue", "evalValue", "runEveryTypeValue", "runEveryType", "runEvery", "responseType", "responseText", "permission", "readOnly", "usableOptions", "runAt" FROM "variable"`, undefined);
    await queryRunner.query(`DROP TABLE "variable"`, undefined);
    await queryRunner.query(`ALTER TABLE "temporary_variable" RENAME TO "variable"`, undefined);
    await queryRunner.query(`CREATE TABLE "temporary_variable_history" ("id" integer PRIMARY KEY NOT NULL, "userId" integer NOT NULL DEFAULT (0), "username" varchar NOT NULL DEFAULT ('n/a'), "currentValue" varchar NOT NULL, "oldValue" text NOT NULL, "changedAt" bigint NOT NULL DEFAULT (0), "variableId" varchar, CONSTRAINT "FK_94d39c77652e9c332751a0cee02" FOREIGN KEY ("variableId") REFERENCES "variable" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION)`, undefined);
    await queryRunner.query(`INSERT INTO "temporary_variable_history"("id", "userId", "username", "currentValue", "oldValue", "changedAt", "variableId") SELECT "id", "userId", "username", "currentValue", "oldValue", "changedAt", "variableId" FROM "variable_history"`, undefined);
    await queryRunner.query(`DROP TABLE "variable_history"`, undefined);
    await queryRunner.query(`ALTER TABLE "temporary_variable_history" RENAME TO "variable_history"`, undefined);
    await queryRunner.query(`CREATE TABLE "temporary_variable_watch" ("id" integer PRIMARY KEY NOT NULL, "variableId" varchar NOT NULL, "order" integer NOT NULL)`, undefined);
    await queryRunner.query(`INSERT INTO "temporary_variable_watch"("id", "variableId", "order") SELECT "id", "variableId", "order" FROM "variable_watch"`, undefined);
    await queryRunner.query(`DROP TABLE "variable_watch"`, undefined);
    await queryRunner.query(`ALTER TABLE "temporary_variable_watch" RENAME TO "variable_watch"`, undefined);
  }

  public async down(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(`ALTER TABLE "variable_watch" RENAME TO "temporary_variable_watch"`, undefined);
    await queryRunner.query(`CREATE TABLE "variable_watch" ("id" varchar PRIMARY KEY NOT NULL, "variableId" varchar NOT NULL, "order" integer NOT NULL)`, undefined);
    await queryRunner.query(`INSERT INTO "variable_watch"("id", "variableId", "order") SELECT "id", "variableId", "order" FROM "temporary_variable_watch"`, undefined);
    await queryRunner.query(`DROP TABLE "temporary_variable_watch"`, undefined);
    await queryRunner.query(`ALTER TABLE "variable_history" RENAME TO "temporary_variable_history"`, undefined);
    await queryRunner.query(`CREATE TABLE "variable_history" ("id" varchar PRIMARY KEY NOT NULL, "userId" integer NOT NULL DEFAULT (0), "username" varchar NOT NULL DEFAULT ('n/a'), "currentValue" varchar NOT NULL, "oldValue" text NOT NULL, "changedAt" bigint NOT NULL DEFAULT (0), "variableId" varchar, CONSTRAINT "FK_94d39c77652e9c332751a0cee02" FOREIGN KEY ("variableId") REFERENCES "variable" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION)`, undefined);
    await queryRunner.query(`INSERT INTO "variable_history"("id", "userId", "username", "currentValue", "oldValue", "changedAt", "variableId") SELECT "id", "userId", "username", "currentValue", "oldValue", "changedAt", "variableId" FROM "temporary_variable_history"`, undefined);
    await queryRunner.query(`DROP TABLE "temporary_variable_history"`, undefined);
    await queryRunner.query(`ALTER TABLE "variable" RENAME TO "temporary_variable"`, undefined);
    await queryRunner.query(`CREATE TABLE "variable" ("id" varchar PRIMARY KEY NOT NULL, "variableName" varchar NOT NULL, "description" varchar NOT NULL, "type" varchar NOT NULL, "currentValue" varchar, "evalValue" text NOT NULL, "runEveryTypeValue" integer NOT NULL DEFAULT (60000), "runEveryType" varchar NOT NULL DEFAULT ('isUsed'), "runEvery" integer NOT NULL DEFAULT (60000), "responseType" integer NOT NULL, "responseText" varchar NOT NULL, "permission" varchar NOT NULL, "readOnly" boolean NOT NULL DEFAULT (0), "usableOptions" text NOT NULL, "runAt" bigint NOT NULL DEFAULT (0))`, undefined);
    await queryRunner.query(`INSERT INTO "variable"("id", "variableName", "description", "type", "currentValue", "evalValue", "runEveryTypeValue", "runEveryType", "runEvery", "responseType", "responseText", "permission", "readOnly", "usableOptions", "runAt") SELECT "id", "variableName", "description", "type", "currentValue", "evalValue", "runEveryTypeValue", "runEveryType", "runEvery", "responseType", "responseText", "permission", "readOnly", "usableOptions", "runAt" FROM "temporary_variable"`, undefined);
    await queryRunner.query(`DROP TABLE "temporary_variable"`, undefined);
    await queryRunner.query(`ALTER TABLE "variable_watch" RENAME TO "temporary_variable_watch"`, undefined);
    await queryRunner.query(`CREATE TABLE "variable_watch" ("id" varchar PRIMARY KEY NOT NULL, "variableId" varchar NOT NULL, "order" integer NOT NULL)`, undefined);
    await queryRunner.query(`INSERT INTO "variable_watch"("id", "variableId", "order") SELECT "id", "variableId", "order" FROM "temporary_variable_watch"`, undefined);
    await queryRunner.query(`DROP TABLE "temporary_variable_watch"`, undefined);
    await queryRunner.query(`ALTER TABLE "variable_history" RENAME TO "temporary_variable_history"`, undefined);
    await queryRunner.query(`CREATE TABLE "variable_history" ("id" varchar PRIMARY KEY NOT NULL, "userId" integer NOT NULL DEFAULT (0), "username" varchar NOT NULL DEFAULT ('n/a'), "currentValue" varchar NOT NULL, "oldValue" text NOT NULL, "changedAt" bigint NOT NULL DEFAULT (0), "variableId" varchar, CONSTRAINT "FK_94d39c77652e9c332751a0cee02" FOREIGN KEY ("variableId") REFERENCES "variable" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION)`, undefined);
    await queryRunner.query(`INSERT INTO "variable_history"("id", "userId", "username", "currentValue", "oldValue", "changedAt", "variableId") SELECT "id", "userId", "username", "currentValue", "oldValue", "changedAt", "variableId" FROM "temporary_variable_history"`, undefined);
    await queryRunner.query(`DROP TABLE "temporary_variable_history"`, undefined);
  }

}
