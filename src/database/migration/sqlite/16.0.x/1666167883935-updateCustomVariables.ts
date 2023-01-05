import { MigrationInterface, QueryRunner } from 'typeorm';
import { insertItemIntoTable } from '~/database/insertItemIntoTable';

export class updateCustomVariables1666167883935 implements MigrationInterface {
  name = 'updateCustomVariables1666167883935';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const items = await queryRunner.query(`SELECT * from "variable"`);
    const items2 = await queryRunner.query(`SELECT * from "variable_history"`);
    const items3 = await queryRunner.query(`SELECT * from "variable_url"`);

    await queryRunner.query(`DROP TABLE "variable"`);
    await queryRunner.query(`DROP TABLE "variable_history"`);
    await queryRunner.query(`DROP TABLE  "variable_url"`);

    await queryRunner.query(`CREATE TABLE "variable" ("id" varchar PRIMARY KEY NOT NULL, "history" text NOT NULL, "urls" text NOT NULL, "variableName" varchar NOT NULL, "description" varchar NOT NULL DEFAULT (''), "type" varchar NOT NULL, "currentValue" varchar, "evalValue" text NOT NULL, "runEveryTypeValue" integer NOT NULL DEFAULT (60000), "runEveryType" varchar NOT NULL DEFAULT ('isUsed'), "runEvery" integer NOT NULL DEFAULT (60000), "responseType" integer NOT NULL, "responseText" varchar NOT NULL DEFAULT (''), "permission" varchar NOT NULL, "readOnly" boolean NOT NULL DEFAULT (0), "usableOptions" text NOT NULL, "runAt" varchar(30) NOT NULL, CONSTRAINT "UQ_dd084634ad76dbefdca837b8de4" UNIQUE ("variableName"))`);

    for (const item of items) {
      item.history = JSON.stringify(items2.filter((o: { variableId: any; }) => o.variableId === item.id));
      item.urls = JSON.stringify(items3.filter((o: { variableId: any; }) => o.variableId === item.id));
      if (item.runEveryType === 'isUsed') {
        item.runEvery = 0;
      }
      await insertItemIntoTable('variable', {
        ...item,
      }, queryRunner);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    return;
  }

}
