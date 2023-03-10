import { MigrationInterface, QueryRunner } from 'typeorm';

import { insertItemIntoTable } from '~/database/insertItemIntoTable';

export class updateAlerts1675089806898 implements MigrationInterface {
  name = 'updateAlerts1675089806898';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const tables = (await queryRunner.query(`SELECT table_name FROM information_schema.tables WHERE table_schema='public'`)).map((o: any) => o.table_name);
    if (tables.includes('alert_cheer')) {
      let items = await queryRunner.query(`SELECT * from "alert"`);

      // remap updatedAt
      items = items.map((o: any) => ({ ...o, updatedAt: new Date().toISOString() }));

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
      await queryRunner.query(`CREATE TABLE "alert" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "updatedAt" character varying(30), "name" character varying NOT NULL, "alertDelayInMs" integer NOT NULL, "profanityFilterType" character varying NOT NULL, "loadStandardProfanityList" json NOT NULL, "parry" json NOT NULL, "tts" json, "fontMessage" json NOT NULL, "font" json NOT NULL, "customProfanityList" character varying NOT NULL, "items" json NOT NULL, CONSTRAINT "PK_ad91cad659a3536465d564a4b2f" PRIMARY KEY ("id"))`);

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
    } else {
      await queryRunner.query(`DROP TABLE "alert"`);
      await queryRunner.query(`CREATE TABLE "alert" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "updatedAt" character varying(30), "name" character varying NOT NULL, "alertDelayInMs" integer NOT NULL, "profanityFilterType" character varying NOT NULL, "loadStandardProfanityList" json NOT NULL, "parry" json NOT NULL, "tts" json, "fontMessage" json NOT NULL, "font" json NOT NULL, "customProfanityList" character varying NOT NULL, "items" json NOT NULL, CONSTRAINT "PK_ad91cad659a3536465d564a4b2f" PRIMARY KEY ("id"))`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    return;
  }

}
