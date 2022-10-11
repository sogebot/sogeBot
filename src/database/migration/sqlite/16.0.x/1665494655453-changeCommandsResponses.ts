import { MigrationInterface, QueryRunner } from 'typeorm';
import { insertItemIntoTable } from '~/database/insertItemIntoTable';

export class changeCommandsResponses1665494655453 implements MigrationInterface {
  name = 'changeCommandsResponses1665494655453';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const items = await queryRunner.query(`SELECT * from "commands"`);
    const items2 = await queryRunner.query(`SELECT * from "commands_responses"`);

    await queryRunner.query(`DELETE from "commands_responses" WHERE 1=1`);
    await queryRunner.query(`DELETE from "commands" WHERE 1=1`);

    await queryRunner.query(`DROP TABLE "commands_responses"`);
    await queryRunner.query(`DROP TABLE "commands"`);

    await queryRunner.query(`CREATE TABLE "commands" ("id" varchar PRIMARY KEY NOT NULL, "command" varchar NOT NULL, "enabled" boolean NOT NULL, "visible" boolean NOT NULL, "group" varchar, "responses" text NOT NULL)`);
    await queryRunner.query(`CREATE INDEX "IDX_1a8c40f0a581447776c325cb4f" ON "commands" ("command") `);

    for (const item of items) {
      item.responses = JSON.stringify(items2.filter((o: any) => o.commandId === item.id));
      await insertItemIntoTable('commands', {
        ...item,
      }, queryRunner);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    return;
  }

}
