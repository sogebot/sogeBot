import { MigrationInterface, QueryRunner } from 'typeorm';
import { insertItemIntoTable } from '~/database/insertItemIntoTable';

export class updateCustomVariables1666167883935 implements MigrationInterface {
  name = 'updateCustomVariables1666167883935';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const items = await queryRunner.query(`SELECT * from "variable"`);
    const items2 = await queryRunner.query(`SELECT * from "variable_history"`);
    const items3 = await queryRunner.query(`SELECT * from "variable_url"`);

    await queryRunner.query(`ALTER TABLE "variable" ADD "history" json NOT NULL`);
    await queryRunner.query(`ALTER TABLE "variable" ADD "urls" json NOT NULL`);
    await queryRunner.query(`ALTER TABLE "variable" ADD CONSTRAINT "UQ_dd084634ad76dbefdca837b8de4" UNIQUE ("variableName")`);
    await queryRunner.query(`ALTER TABLE "variable" DROP COLUMN "runAt"`);
    await queryRunner.query(`ALTER TABLE "variable" ADD "runAt" character varying(30) NOT NULL`);

    await queryRunner.query(`DROP TABLE "variable_history"`);
    await queryRunner.query(`DROP TABLE  "variable_url"`);

    await queryRunner.query(`DELETE FROM "variable" WHERE 1=1`);

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
