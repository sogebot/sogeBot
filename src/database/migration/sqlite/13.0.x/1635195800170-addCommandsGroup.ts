import { MigrationInterface, QueryRunner } from 'typeorm';

export class addCommandsGroup1635195800170 implements MigrationInterface {
  name = 'addCommandsGroup1635195800170';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const responses = await queryRunner.query('SELECT * FROM commands_responses', undefined);
    await queryRunner.query(`CREATE TABLE "commands_group" ("name" varchar PRIMARY KEY NOT NULL, "options" text NOT NULL)`);
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_commands_group_unique_name" ON "commands_group" ("name") `);
    await queryRunner.query(`DROP INDEX "IDX_1a8c40f0a581447776c325cb4f"`);
    await queryRunner.query(`CREATE TABLE "temporary_commands" ("id" varchar PRIMARY KEY NOT NULL, "command" varchar NOT NULL, "enabled" boolean NOT NULL, "visible" boolean NOT NULL, "group" varchar)`);
    await queryRunner.query(`INSERT INTO "temporary_commands"("id", "command", "enabled", "visible") SELECT "id", "command", "enabled", "visible" FROM "commands"`);
    await queryRunner.query(`DROP TABLE "commands"`);
    await queryRunner.query(`DROP TABLE "commands_responses"`);
    await queryRunner.query(`CREATE TABLE "commands_responses" ("id" varchar PRIMARY KEY NOT NULL, "order" integer NOT NULL, "response" text NOT NULL, "stopIfExecuted" boolean NOT NULL, "permission" varchar, "filter" varchar NOT NULL, "commandId" varchar, CONSTRAINT "FK_09da90fa3264f486de9be57b185" FOREIGN KEY ("commandId") REFERENCES "commands" ("id") ON DELETE CASCADE ON UPDATE CASCADE)`);
    await queryRunner.query(`ALTER TABLE "temporary_commands" RENAME TO "commands"`);
    await queryRunner.query(`CREATE INDEX "IDX_1a8c40f0a581447776c325cb4f" ON "commands" ("command") `);
    for (const alert of responses) {
      const keys = Object.keys(alert);
      await queryRunner.query(
        `INSERT INTO "commands_responses"(${keys.map(o => `"${o}"`).join(', ')}) values (${keys.map(o => `?`).join(', ')})`,
        [keys.map(key => alert[key])],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    return;
  }
}