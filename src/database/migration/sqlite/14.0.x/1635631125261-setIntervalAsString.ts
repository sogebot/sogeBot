import * as constants from '@sogebot/ui-helpers/constants';
import { MigrationInterface, QueryRunner } from 'typeorm';

const interval = {
  'hour':  constants.HOUR,
  'day':   constants.DAY,
  'week':  7 * constants.DAY,
  'month': 31 * constants.DAY,
  'year':  365 * constants.DAY,
} ;

export class setIntervalAsString1635631125261 implements MigrationInterface {
  name = 'setIntervalAsString1635631125261';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const items = await queryRunner.query('SELECT * FROM goal', undefined);
    await queryRunner.query('DELETE FROM "goal" WHERE 1=1');

    await queryRunner.query(`DROP INDEX "IDX_a1a6bd23cb8ef7ddf921f54c0b"`);
    await queryRunner.query(`DROP TABLE "goal"`);
    await queryRunner.query(`CREATE TABLE "goal" ("id" varchar PRIMARY KEY NOT NULL, "groupId" varchar, "name" varchar NOT NULL, "type" varchar(20) NOT NULL, "countBitsAsTips" boolean NOT NULL, "display" varchar(20) NOT NULL, "timestamp" bigint NOT NULL DEFAULT (0), "goalAmount" float NOT NULL DEFAULT (0), "currentAmount" float NOT NULL DEFAULT (0), "endAfter" bigint NOT NULL, "endAfterIgnore" boolean NOT NULL, "customizationBar" text NOT NULL, "customizationFont" text NOT NULL, "customizationHtml" text NOT NULL, "customizationJs" text NOT NULL, "customizationCss" text NOT NULL, "interval" varchar NOT NULL DEFAULT ('hour'), CONSTRAINT "FK_a1a6bd23cb8ef7ddf921f54c0bb" FOREIGN KEY ("groupId") REFERENCES "goal_group" ("id") ON DELETE CASCADE ON UPDATE CASCADE)`);
    await queryRunner.query(`CREATE INDEX "IDX_a1a6bd23cb8ef7ddf921f54c0b" ON "goal" ("groupId") `);
    for (const item of items) {
      for (const key of Object.keys(interval)) {
        if (item.interval === (interval as any)[key]) {
          item.interval = key;
        }
      }
      const keys = Object.keys(item);
      await queryRunner.query(
        `INSERT INTO "goal"(${keys.map(o => `"${o}"`).join(', ')}) values (${keys.map(o => `?`).join(', ')})`,
        [keys.map(key => item[key])],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_a1a6bd23cb8ef7ddf921f54c0b"`);
    await queryRunner.query(`ALTER TABLE "goal" RENAME TO "temporary_goal"`);
    await queryRunner.query(`CREATE TABLE "goal" ("id" varchar PRIMARY KEY NOT NULL, "groupId" varchar, "name" varchar NOT NULL, "type" varchar(20) NOT NULL, "countBitsAsTips" boolean NOT NULL, "display" varchar(20) NOT NULL, "timestamp" bigint NOT NULL DEFAULT (0), "goalAmount" float NOT NULL DEFAULT (0), "currentAmount" float NOT NULL DEFAULT (0), "endAfter" bigint NOT NULL, "endAfterIgnore" boolean NOT NULL, "customizationBar" text NOT NULL, "customizationFont" text NOT NULL, "customizationHtml" text NOT NULL, "customizationJs" text NOT NULL, "customizationCss" text NOT NULL, "interval" bigint NOT NULL DEFAULT (0), CONSTRAINT "FK_a1a6bd23cb8ef7ddf921f54c0bb" FOREIGN KEY ("groupId") REFERENCES "goal_group" ("id") ON DELETE CASCADE ON UPDATE CASCADE)`);
    await queryRunner.query(`INSERT INTO "goal"("id", "groupId", "name", "type", "countBitsAsTips", "display", "timestamp", "goalAmount", "currentAmount", "endAfter", "endAfterIgnore", "customizationBar", "customizationFont", "customizationHtml", "customizationJs", "customizationCss", "interval") SELECT "id", "groupId", "name", "type", "countBitsAsTips", "display", "timestamp", "goalAmount", "currentAmount", "endAfter", "endAfterIgnore", "customizationBar", "customizationFont", "customizationHtml", "customizationJs", "customizationCss", "interval" FROM "temporary_goal"`);
    await queryRunner.query(`DROP TABLE "temporary_goal"`);
    await queryRunner.query(`CREATE INDEX "IDX_a1a6bd23cb8ef7ddf921f54c0b" ON "goal" ("groupId") `);
    await queryRunner.query(`DROP INDEX "IDX_a1a6bd23cb8ef7ddf921f54c0b"`);
    await queryRunner.query(`ALTER TABLE "goal" RENAME TO "temporary_goal"`);
    await queryRunner.query(`CREATE TABLE "goal" ("id" varchar PRIMARY KEY NOT NULL, "groupId" varchar, "name" varchar NOT NULL, "type" varchar(20) NOT NULL, "countBitsAsTips" boolean NOT NULL, "display" varchar(20) NOT NULL, "timestamp" bigint NOT NULL DEFAULT (0), "goalAmount" float NOT NULL DEFAULT (0), "currentAmount" float NOT NULL DEFAULT (0), "endAfter" bigint NOT NULL, "endAfterIgnore" boolean NOT NULL, "customizationBar" text NOT NULL, "customizationFont" text NOT NULL, "customizationHtml" text NOT NULL, "customizationJs" text NOT NULL, "customizationCss" text NOT NULL, "interval" bigint NOT NULL DEFAULT (0), CONSTRAINT "FK_a1a6bd23cb8ef7ddf921f54c0bb" FOREIGN KEY ("groupId") REFERENCES "goal_group" ("id") ON DELETE CASCADE ON UPDATE CASCADE)`);
    await queryRunner.query(`INSERT INTO "goal"("id", "groupId", "name", "type", "countBitsAsTips", "display", "timestamp", "goalAmount", "currentAmount", "endAfter", "endAfterIgnore", "customizationBar", "customizationFont", "customizationHtml", "customizationJs", "customizationCss", "interval") SELECT "id", "groupId", "name", "type", "countBitsAsTips", "display", "timestamp", "goalAmount", "currentAmount", "endAfter", "endAfterIgnore", "customizationBar", "customizationFont", "customizationHtml", "customizationJs", "customizationCss", "interval" FROM "temporary_goal"`);
    await queryRunner.query(`DROP TABLE "temporary_goal"`);
    await queryRunner.query(`CREATE INDEX "IDX_a1a6bd23cb8ef7ddf921f54c0b" ON "goal" ("groupId") `);
  }

}
