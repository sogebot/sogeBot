import { MigrationInterface, QueryRunner } from 'typeorm';

export class updateCustomVariables1666167883936 implements MigrationInterface {
  name = 'updateCustomVariables1666167883936';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "temporary_variable" ("id" varchar PRIMARY KEY NOT NULL, "history" text NOT NULL, "urls" text NOT NULL, "variableName" varchar NOT NULL, "description" varchar NOT NULL DEFAULT (''), "type" varchar NOT NULL, "currentValue" varchar, "evalValue" text NOT NULL, "runEvery" integer NOT NULL DEFAULT (60000), "responseType" integer NOT NULL, "responseText" varchar NOT NULL DEFAULT (''), "permission" varchar NOT NULL, "readOnly" boolean NOT NULL DEFAULT (0), "usableOptions" text NOT NULL, "runAt" varchar(30) NOT NULL, CONSTRAINT "UQ_dd084634ad76dbefdca837b8de4" UNIQUE ("variableName"))`);
    await queryRunner.query(`INSERT INTO "temporary_variable"("id", "history", "urls", "variableName", "description", "type", "currentValue", "evalValue", "runEvery", "responseType", "responseText", "permission", "readOnly", "usableOptions", "runAt") SELECT "id", "history", "urls", "variableName", "description", "type", "currentValue", "evalValue", "runEvery", "responseType", "responseText", "permission", "readOnly", "usableOptions", "runAt" FROM "variable"`);
    await queryRunner.query(`DROP TABLE "variable"`);
    await queryRunner.query(`ALTER TABLE "temporary_variable" RENAME TO "variable"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    return;
  }

}
