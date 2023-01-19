import { MigrationInterface, QueryRunner } from 'typeorm';

import { insertItemIntoTable } from '~/database/insertItemIntoTable';

export class updateRandomizer1666167883938 implements MigrationInterface {
  name = 'updateRandomizer1666167883938';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const items = await queryRunner.query(`SELECT * from "randomizer"`);
    const items2 = await queryRunner.query(`SELECT * from "randomizer_item"`);

    await queryRunner.query(`DROP TABLE "randomizer_item"`);
    await queryRunner.query(`DROP TABLE "randomizer"`);
    await queryRunner.query(`CREATE TABLE "randomizer" ("id" varchar PRIMARY KEY NOT NULL, "items" text NOT NULL, "createdAt" varchar(30) NOT NULL, "command" varchar NOT NULL, "permissionId" varchar NOT NULL, "name" varchar NOT NULL, "isShown" boolean NOT NULL DEFAULT (0), "shouldPlayTick" boolean NOT NULL, "tickVolume" integer NOT NULL, "widgetOrder" integer NOT NULL, "type" varchar(20) NOT NULL DEFAULT ('simple'), "position" text NOT NULL, "customizationFont" text NOT NULL, "tts" text NOT NULL)`);
    await queryRunner.query(`CREATE UNIQUE INDEX "idx_randomizer_cmdunique" ON "randomizer" ("command") `);

    for (const item of items) {
      await insertItemIntoTable('randomizer', {
        ...item,
        createdAt: new Date(item.createdAt).toISOString(),
        items:     JSON.stringify(items2.filter((o: any) => o.randomizerId === item.id)),
      }, queryRunner);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    return;
  }

}
