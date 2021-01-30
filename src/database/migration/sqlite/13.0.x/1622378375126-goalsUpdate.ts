import { MigrationInterface, QueryRunner } from 'typeorm';

export class goalsUpdate1622378375126 implements MigrationInterface {
  name = 'goalsUpdate1622378375126';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const origGoals = await queryRunner.query('SELECT * FROM goal', undefined);

    await queryRunner.query(`DROP INDEX "IDX_a1a6bd23cb8ef7ddf921f54c0b"`);
    await queryRunner.query(`CREATE TABLE "temporary_goal" ("id" varchar PRIMARY KEY NOT NULL, "groupId" varchar, "name" varchar NOT NULL, "type" varchar(20) NOT NULL, "countBitsAsTips" boolean NOT NULL, "display" varchar(20) NOT NULL, "timestamp" bigint NOT NULL DEFAULT (0), "goalAmount" float NOT NULL DEFAULT (0), "currentAmount" float NOT NULL DEFAULT (0), "endAfter" varchar NOT NULL, "endAfterIgnore" boolean NOT NULL, "customizationBar" text NOT NULL, "customizationFont" text NOT NULL, "customizationHtml" text NOT NULL, "customizationJs" text NOT NULL, "customizationCss" text NOT NULL, CONSTRAINT "FK_a1a6bd23cb8ef7ddf921f54c0bb" FOREIGN KEY ("groupId") REFERENCES "goal_group" ("id") ON DELETE CASCADE ON UPDATE CASCADE)`);
    await queryRunner.query(`INSERT INTO "temporary_goal"("id", "groupId", "name", "type", "countBitsAsTips", "display", "timestamp", "goalAmount", "currentAmount", "endAfter", "endAfterIgnore", "customizationBar", "customizationFont", "customizationHtml", "customizationJs", "customizationCss") SELECT "id", "groupId", "name", "type", "countBitsAsTips", "display", "timestamp", "goalAmount", "currentAmount", "endAfter", "endAfterIgnore", "customizationBar", "customizationFont", "customizationHtml", "customizationJs", "customizationCss" FROM "goal"`);
    await queryRunner.query(`DROP TABLE "goal"`);
    await queryRunner.query(`ALTER TABLE "temporary_goal" RENAME TO "goal"`);
    await queryRunner.query(`CREATE INDEX "IDX_a1a6bd23cb8ef7ddf921f54c0b" ON "goal" ("groupId") `);
    await queryRunner.query(`DROP INDEX "IDX_a1a6bd23cb8ef7ddf921f54c0b"`);
    await queryRunner.query(`CREATE TABLE "temporary_goal" ("id" varchar PRIMARY KEY NOT NULL, "groupId" varchar, "name" varchar NOT NULL, "type" varchar(20) NOT NULL, "countBitsAsTips" boolean NOT NULL, "display" varchar(20) NOT NULL, "timestamp" bigint NOT NULL DEFAULT (0), "goalAmount" float NOT NULL DEFAULT (0), "currentAmount" float NOT NULL DEFAULT (0), "endAfter" bigint NOT NULL, "endAfterIgnore" boolean NOT NULL, "customizationBar" text NOT NULL, "customizationFont" text NOT NULL, "customizationHtml" text NOT NULL, "customizationJs" text NOT NULL, "customizationCss" text NOT NULL, CONSTRAINT "FK_a1a6bd23cb8ef7ddf921f54c0bb" FOREIGN KEY ("groupId") REFERENCES "goal_group" ("id") ON DELETE CASCADE ON UPDATE CASCADE)`);
    await queryRunner.query(`INSERT INTO "temporary_goal"("id", "groupId", "name", "type", "countBitsAsTips", "display", "timestamp", "goalAmount", "currentAmount", "endAfter", "endAfterIgnore", "customizationBar", "customizationFont", "customizationHtml", "customizationJs", "customizationCss") SELECT "id", "groupId", "name", "type", "countBitsAsTips", "display", "timestamp", "goalAmount", "currentAmount", "endAfter", "endAfterIgnore", "customizationBar", "customizationFont", "customizationHtml", "customizationJs", "customizationCss" FROM "goal"`);
    await queryRunner.query(`DROP TABLE "goal"`);
    await queryRunner.query(`ALTER TABLE "temporary_goal" RENAME TO "goal"`);
    await queryRunner.query(`CREATE INDEX "IDX_a1a6bd23cb8ef7ddf921f54c0b" ON "goal" ("groupId") `);

    // add shadow if missing
    const goals = await queryRunner.manager.getRepository(`goal`).find();
    for (const goal of goals as any) {
      goal.endAfter = new Date(origGoals.find((o: { id: any; }) => o.id === goal.id).endAfter).getTime();
      if (!goal.customizationFont.shadow) {
        goal.customizationFont.shadow = [];
      }
      await queryRunner.manager.getRepository(`goal`).save(goal);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_a1a6bd23cb8ef7ddf921f54c0b"`);
    await queryRunner.query(`ALTER TABLE "goal" RENAME TO "temporary_goal"`);
    await queryRunner.query(`CREATE TABLE "goal" ("id" varchar PRIMARY KEY NOT NULL, "groupId" varchar, "name" varchar NOT NULL, "type" varchar(20) NOT NULL, "countBitsAsTips" boolean NOT NULL, "display" varchar(20) NOT NULL, "timestamp" bigint NOT NULL DEFAULT (0), "goalAmount" float NOT NULL DEFAULT (0), "currentAmount" float NOT NULL DEFAULT (0), "endAfter" varchar NOT NULL, "endAfterIgnore" boolean NOT NULL, "customizationBar" text NOT NULL, "customizationFont" text NOT NULL, "customizationHtml" text NOT NULL, "customizationJs" text NOT NULL, "customizationCss" text NOT NULL, CONSTRAINT "FK_a1a6bd23cb8ef7ddf921f54c0bb" FOREIGN KEY ("groupId") REFERENCES "goal_group" ("id") ON DELETE CASCADE ON UPDATE CASCADE)`);
    await queryRunner.query(`INSERT INTO "goal"("id", "groupId", "name", "type", "countBitsAsTips", "display", "timestamp", "goalAmount", "currentAmount", "endAfter", "endAfterIgnore", "customizationBar", "customizationFont", "customizationHtml", "customizationJs", "customizationCss") SELECT "id", "groupId", "name", "type", "countBitsAsTips", "display", "timestamp", "goalAmount", "currentAmount", "endAfter", "endAfterIgnore", "customizationBar", "customizationFont", "customizationHtml", "customizationJs", "customizationCss" FROM "temporary_goal"`);
    await queryRunner.query(`DROP TABLE "temporary_goal"`);
    await queryRunner.query(`CREATE INDEX "IDX_a1a6bd23cb8ef7ddf921f54c0b" ON "goal" ("groupId") `);
    await queryRunner.query(`DROP INDEX "IDX_a1a6bd23cb8ef7ddf921f54c0b"`);
    await queryRunner.query(`ALTER TABLE "goal" RENAME TO "temporary_goal"`);
    await queryRunner.query(`CREATE TABLE "goal" ("id" varchar PRIMARY KEY NOT NULL, "groupId" varchar, "name" varchar NOT NULL, "type" varchar(20) NOT NULL, "countBitsAsTips" boolean NOT NULL, "display" varchar(20) NOT NULL, "timestamp" bigint NOT NULL DEFAULT (0), "goalAmount" float NOT NULL DEFAULT (0), "currentAmount" float NOT NULL DEFAULT (0), "endAfter" varchar NOT NULL, "endAfterIgnore" boolean NOT NULL, "customizationBar" text NOT NULL, "customizationFont" text NOT NULL, "customizationHtml" text NOT NULL, "customizationJs" text NOT NULL, "customizationCss" text NOT NULL, CONSTRAINT "FK_a1a6bd23cb8ef7ddf921f54c0bb" FOREIGN KEY ("groupId") REFERENCES "goal_group" ("id") ON DELETE CASCADE ON UPDATE CASCADE)`);
    await queryRunner.query(`INSERT INTO "goal"("id", "groupId", "name", "type", "countBitsAsTips", "display", "timestamp", "goalAmount", "currentAmount", "endAfter", "endAfterIgnore", "customizationBar", "customizationFont", "customizationHtml", "customizationJs", "customizationCss") SELECT "id", "groupId", "name", "type", "countBitsAsTips", "display", "timestamp", "goalAmount", "currentAmount", "endAfter", "endAfterIgnore", "customizationBar", "customizationFont", "customizationHtml", "customizationJs", "customizationCss" FROM "temporary_goal"`);
    await queryRunner.query(`DROP TABLE "temporary_goal"`);
    await queryRunner.query(`CREATE INDEX "IDX_a1a6bd23cb8ef7ddf921f54c0b" ON "goal" ("groupId") `);
  }

}
