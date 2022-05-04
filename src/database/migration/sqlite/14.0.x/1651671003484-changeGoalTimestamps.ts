import { MigrationInterface, QueryRunner } from 'typeorm';

export class changeGoalTimestamps1651671003484 implements MigrationInterface {
  name = 'changeGoalTimestamps1651671003484';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const goalGroup = await queryRunner.query(`SELECT * from "goal_group"`);
    const goal = await queryRunner.query(`SELECT * from "goal"`);

    await queryRunner.query(`DROP INDEX "IDX_a1a6bd23cb8ef7ddf921f54c0b"`);
    await queryRunner.query(`DROP TABLE "goal_group"`);
    await queryRunner.query(`DROP TABLE "goal"`);

    await queryRunner.query(`CREATE TABLE "goal_group" ("id" varchar PRIMARY KEY NOT NULL, "createdAt" varchar NOT NULL, "name" varchar NOT NULL, "display" text NOT NULL)`);
    await queryRunner.query(`CREATE TABLE "goal" ("id" varchar PRIMARY KEY NOT NULL, "groupId" varchar, "name" varchar NOT NULL, "type" varchar(20) NOT NULL, "countBitsAsTips" boolean NOT NULL, "display" varchar(20) NOT NULL, "timestamp" varchar, "goalAmount" float NOT NULL DEFAULT (0), "currentAmount" float NOT NULL DEFAULT (0), "endAfter" varchar NOT NULL, "endAfterIgnore" boolean NOT NULL, "customizationBar" text NOT NULL, "customizationFont" text NOT NULL, "customizationHtml" text NOT NULL, "customizationJs" text NOT NULL, "customizationCss" text NOT NULL, "interval" varchar NOT NULL DEFAULT ('hour'), "tiltifyCampaign" integer, CONSTRAINT "FK_a1a6bd23cb8ef7ddf921f54c0bb" FOREIGN KEY ("groupId") REFERENCES "goal_group" ("id") ON DELETE CASCADE ON UPDATE CASCADE)`);

    await queryRunner.query(`CREATE INDEX "IDX_a1a6bd23cb8ef7ddf921f54c0b" ON "goal" ("groupId") `);

    for (const item of goalGroup) {
      const keys = Object.keys(item);
      item.createdAt = new Date(item.createdAt).toISOString();
      await queryRunner.query(
        `INSERT INTO "goal_group"(${keys.map(o => `"${o}"`).join(', ')}) values (${keys.map(o => `?`).join(', ')})`,
        keys.map(key => item[key]),
      );
    }

    for (const item of goal) {
      const keys = Object.keys(item);
      item.timestamp = new Date(item.timestamp).toISOString();
      item.endAfter = new Date(item.endAfter).toISOString();
      await queryRunner.query(
        `INSERT INTO "goal"(${keys.map(o => `"${o}"`).join(', ')}) values (${keys.map(o => `?`).join(', ')})`,
        keys.map(key => item[key]),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    return;
  }

}
