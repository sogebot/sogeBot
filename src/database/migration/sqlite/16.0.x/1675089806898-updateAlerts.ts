import { MigrationInterface, QueryRunner } from 'typeorm';

import { insertItemIntoTable } from '~/database/insertItemIntoTable';

export class updateAlerts1675089806898 implements MigrationInterface {
  name = 'updateAlerts1675089806898';

  public async up(queryRunner: QueryRunner): Promise<void> {
    let items = await queryRunner.query(`SELECT * from "alert"`);

    // remap updatedAt
    items = items.map((o: any) => ({ ...o, updatedAt: new Date(o.updatedAt).toISOString() }));

    const types = [
      'cheer', 'command_redeem','follow', 'promo', 'raid', 'resub',
      'reward_redeem', 'sub', 'subcommunitygift', 'subgift', 'tip',
    ];
    const alerts: Record<string, any> = {};
    for (const type of types) {
      try {
        alerts[type] = await queryRunner.query(`SELECT * from "alert_${type}"`);
      } catch {
        alerts[type] = [];
      }
    }

    // clear tables
    for (const type of types) {
      try {
        await queryRunner.query(`DROP TABLE "alert_${type}"`);
      } catch {
        null;
      }
    }
    await queryRunner.query(`DROP TABLE "alert"`);

    await queryRunner.query(`CREATE TABLE "alert" ("id" varchar PRIMARY KEY NOT NULL, "updatedAt" varchar(30), "name" varchar NOT NULL, "alertDelayInMs" integer NOT NULL, "profanityFilterType" varchar NOT NULL, "loadStandardProfanityList" text NOT NULL, "parry" text NOT NULL, "tts" text, "fontMessage" text NOT NULL, "font" text NOT NULL, "customProfanityList" varchar NOT NULL, "items" text NOT NULL)`);
    for (const item of items) {
      item.items = [];
      for (let type of types) {
        const alertList = alerts[type].filter((o: any) => o.alertId === item.id);
        if (type === 'command_redeem') {
          type = 'custom'; // remap to custom
        }
        // add missing type
        item.items.push(...alertList.map((o: any) => ({ ...o, type })));
      }
      item.items = JSON.stringify(item.items); // stringify items
      await insertItemIntoTable('alert', item, queryRunner);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    return;
  }

}
