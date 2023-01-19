import { MigrationInterface, QueryRunner } from 'typeorm';

import { insertItemIntoTable } from '~/database/insertItemIntoTable';

export class updateRandomizer1666167883938 implements MigrationInterface {
  name = 'updateRandomizer1666167883938';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const items = await queryRunner.query(`SELECT * from "randomizer"`);
    const items2 = await queryRunner.query(`SELECT * from "randomizer_item"`);

    await queryRunner.query(`DROP TABLE "randomizer_item"`);
    await queryRunner.query(`DROP TABLE "randomizer"`);
    await queryRunner.query(`CREATE TABLE "randomizer" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "items" json NOT NULL, "createdAt" character varying(30) NOT NULL, "command" character varying NOT NULL, "permissionId" character varying NOT NULL, "name" character varying NOT NULL, "isShown" boolean NOT NULL DEFAULT false, "shouldPlayTick" boolean NOT NULL, "tickVolume" integer NOT NULL, "widgetOrder" integer NOT NULL, "type" character varying(20) NOT NULL DEFAULT 'simple', "position" json NOT NULL, "customizationFont" json NOT NULL, "tts" json NOT NULL, CONSTRAINT "PK_027539f48a550dda46773420ad7" PRIMARY KEY ("id"))`);
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
