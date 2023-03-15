import { MigrationInterface, QueryRunner } from 'typeorm';

import { insertItemIntoTable } from '~/database/insertItemIntoTable';

export class updateAlerts1675089806898 implements MigrationInterface {
  name = 'updateAlerts1675089806898';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const tables = (await queryRunner.query(`SHOW TABLES`)).map((o: any) => o.Tables_in_sogebot);
    if (tables.includes('alert_cheer')) {
      let items = await queryRunner.query(`SELECT * from \`alert\``);

      // remap updatedAt
      items = items.map((o: any) => ({ ...o, updatedAt: new Date().toISOString() }));

      const types = [
        'cheer', 'command_redeem','follow', 'promo', 'raid', 'resub',
        'reward_redeem', 'sub', 'subcommunitygift', 'subgift', 'tip',
        'host',
      ];
      const alerts: Record<string, any> = {};
      for (const type of types) {
        try {
          alerts[type] = await queryRunner.query(`SELECT * from \`alert_${type}\``);
        } catch {
          alerts[type] = [];
        }
      }

      // clear tables
      for (const type of types) {
        try {
          await queryRunner.query(`DROP TABLE \`alert_${type}\``);
        } catch {
          null;
        }
      }
      await queryRunner.query(`DROP TABLE \`alert\``);
      await queryRunner.query(`CREATE TABLE \`alert\` (\`id\` varchar(36) NOT NULL, \`updatedAt\` varchar(30) NULL, \`name\` varchar(255) NOT NULL, \`alertDelayInMs\` int NOT NULL, \`profanityFilterType\` varchar(255) NOT NULL, \`loadStandardProfanityList\` json NOT NULL, \`parry\` json NOT NULL, \`tts\` json NULL, \`fontMessage\` json NOT NULL, \`font\` json NOT NULL, \`customProfanityList\` varchar(255) NOT NULL, \`items\` json NOT NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
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
      await queryRunner.query(`DROP TABLE \`alert\``);
      await queryRunner.query(`CREATE TABLE \`alert\` (\`id\` varchar(36) NOT NULL, \`updatedAt\` varchar(30) NULL, \`name\` varchar(255) NOT NULL, \`alertDelayInMs\` int NOT NULL, \`profanityFilterType\` varchar(255) NOT NULL, \`loadStandardProfanityList\` json NOT NULL, \`parry\` json NOT NULL, \`tts\` json NULL, \`fontMessage\` json NOT NULL, \`font\` json NOT NULL, \`customProfanityList\` varchar(255) NOT NULL, \`items\` json NOT NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);

    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    return;
  }

}
