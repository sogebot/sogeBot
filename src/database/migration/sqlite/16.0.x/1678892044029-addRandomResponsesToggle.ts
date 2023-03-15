import { MigrationInterface, QueryRunner } from 'typeorm';

export class addRandomResponsesToggle1675089806900 implements MigrationInterface {
  name = 'addRandomResponsesToggle1675089806900';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_1a8c40f0a581447776c325cb4f"`);
    await queryRunner.query(`CREATE TABLE "temporary_commands" ("id" varchar PRIMARY KEY NOT NULL, "command" varchar NOT NULL, "enabled" boolean NOT NULL, "visible" boolean NOT NULL, "group" varchar, "responses" text NOT NULL, "areResponsesRandomized" boolean NOT NULL DEFAULT (0))`);
    await queryRunner.query(`INSERT INTO "temporary_commands"("id", "command", "enabled", "visible", "group", "responses") SELECT "id", "command", "enabled", "visible", "group", "responses" FROM "commands"`);
    await queryRunner.query(`DROP TABLE "commands"`);
    await queryRunner.query(`ALTER TABLE "temporary_commands" RENAME TO "commands"`);
    await queryRunner.query(`CREATE INDEX "IDX_1a8c40f0a581447776c325cb4f" ON "commands" ("command") `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    return;
  }

}
