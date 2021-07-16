import { MigrationInterface, QueryRunner } from 'typeorm';

export class customvariableNullFix1573907992334 implements MigrationInterface {
  name = 'customvariableNullFix1573907992334';

  public async up(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(`CREATE TABLE "temporary_variable" ("id" varchar PRIMARY KEY NOT NULL, "variableName" varchar NOT NULL, "description" varchar NOT NULL DEFAULT (''), "type" varchar NOT NULL, "currentValue" varchar NOT NULL, "evalValue" text NOT NULL, "runEveryTypeValue" integer NOT NULL DEFAULT (60000), "runEveryType" varchar NOT NULL DEFAULT ('isUsed'), "runEvery" integer NOT NULL DEFAULT (60000), "responseType" integer NOT NULL, "responseText" varchar NOT NULL DEFAULT (''), "permission" varchar NOT NULL, "readOnly" boolean NOT NULL DEFAULT (0), "usableOptions" text NOT NULL, "runAt" bigint NOT NULL DEFAULT (0))`, undefined);
    await queryRunner.query(`INSERT INTO "temporary_variable"("id", "variableName", "description", "type", "currentValue", "evalValue", "runEveryTypeValue", "runEveryType", "runEvery", "responseType", "responseText", "permission", "readOnly", "usableOptions", "runAt") SELECT "id", "variableName", "description", "type", "currentValue", "evalValue", "runEveryTypeValue", "runEveryType", "runEvery", "responseType", "responseText", "permission", "readOnly", "usableOptions", "runAt" FROM "variable"`, undefined);
    await queryRunner.query(`DROP TABLE "variable"`, undefined);
    await queryRunner.query(`ALTER TABLE "temporary_variable" RENAME TO "variable"`, undefined);
    await queryRunner.query(`CREATE TABLE "temporary_variable" ("id" varchar PRIMARY KEY NOT NULL, "variableName" varchar NOT NULL, "description" varchar NOT NULL DEFAULT (''), "type" varchar NOT NULL, "currentValue" varchar, "evalValue" text NOT NULL, "runEveryTypeValue" integer NOT NULL DEFAULT (60000), "runEveryType" varchar NOT NULL DEFAULT ('isUsed'), "runEvery" integer NOT NULL DEFAULT (60000), "responseType" integer NOT NULL, "responseText" varchar NOT NULL DEFAULT (''), "permission" varchar NOT NULL, "readOnly" boolean NOT NULL DEFAULT (0), "usableOptions" text NOT NULL, "runAt" bigint NOT NULL DEFAULT (0))`, undefined);
    await queryRunner.query(`INSERT INTO "temporary_variable"("id", "variableName", "description", "type", "currentValue", "evalValue", "runEveryTypeValue", "runEveryType", "runEvery", "responseType", "responseText", "permission", "readOnly", "usableOptions", "runAt") SELECT "id", "variableName", "description", "type", "currentValue", "evalValue", "runEveryTypeValue", "runEveryType", "runEvery", "responseType", "responseText", "permission", "readOnly", "usableOptions", "runAt" FROM "variable"`, undefined);
    await queryRunner.query(`DROP TABLE "variable"`, undefined);
    await queryRunner.query(`ALTER TABLE "temporary_variable" RENAME TO "variable"`, undefined);
  }

  public async down(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(`ALTER TABLE "variable" RENAME TO "temporary_variable"`, undefined);
    await queryRunner.query(`CREATE TABLE "variable" ("id" varchar PRIMARY KEY NOT NULL, "variableName" varchar NOT NULL, "description" varchar NOT NULL DEFAULT (''), "type" varchar NOT NULL, "currentValue" varchar NOT NULL, "evalValue" text NOT NULL, "runEveryTypeValue" integer NOT NULL DEFAULT (60000), "runEveryType" varchar NOT NULL DEFAULT ('isUsed'), "runEvery" integer NOT NULL DEFAULT (60000), "responseType" integer NOT NULL, "responseText" varchar NOT NULL DEFAULT (''), "permission" varchar NOT NULL, "readOnly" boolean NOT NULL DEFAULT (0), "usableOptions" text NOT NULL, "runAt" bigint NOT NULL DEFAULT (0))`, undefined);
    await queryRunner.query(`INSERT INTO "variable"("id", "variableName", "description", "type", "currentValue", "evalValue", "runEveryTypeValue", "runEveryType", "runEvery", "responseType", "responseText", "permission", "readOnly", "usableOptions", "runAt") SELECT "id", "variableName", "description", "type", "currentValue", "evalValue", "runEveryTypeValue", "runEveryType", "runEvery", "responseType", "responseText", "permission", "readOnly", "usableOptions", "runAt" FROM "temporary_variable"`, undefined);
    await queryRunner.query(`DROP TABLE "temporary_variable"`, undefined);
    await queryRunner.query(`ALTER TABLE "variable" RENAME TO "temporary_variable"`, undefined);
    await queryRunner.query(`CREATE TABLE "variable" ("id" varchar PRIMARY KEY NOT NULL, "variableName" varchar NOT NULL, "description" varchar NOT NULL DEFAULT (''), "type" varchar NOT NULL, "currentValue" varchar NOT NULL, "evalValue" text NOT NULL, "runEveryTypeValue" integer NOT NULL DEFAULT (60000), "runEveryType" varchar NOT NULL DEFAULT ('isUsed'), "runEvery" integer NOT NULL DEFAULT (60000), "responseType" integer NOT NULL, "responseText" varchar NOT NULL DEFAULT (''), "permission" varchar NOT NULL, "readOnly" boolean NOT NULL DEFAULT (0), "usableOptions" text NOT NULL, "runAt" bigint NOT NULL DEFAULT (0))`, undefined);
    await queryRunner.query(`INSERT INTO "variable"("id", "variableName", "description", "type", "currentValue", "evalValue", "runEveryTypeValue", "runEveryType", "runEvery", "responseType", "responseText", "permission", "readOnly", "usableOptions", "runAt") SELECT "id", "variableName", "description", "type", "currentValue", "evalValue", "runEveryTypeValue", "runEveryType", "runEvery", "responseType", "responseText", "permission", "readOnly", "usableOptions", "runAt" FROM "temporary_variable"`, undefined);
    await queryRunner.query(`DROP TABLE "temporary_variable"`, undefined);
  }

}
