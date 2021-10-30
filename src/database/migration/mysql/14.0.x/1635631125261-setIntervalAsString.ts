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
    const items = await queryRunner.query('SELECT * FROM `goal`', undefined);
    await queryRunner.query('DELETE FROM `goal` WHERE 1=1');
    await queryRunner.query(`ALTER TABLE \`goal\` DROP COLUMN \`interval\``);
    await queryRunner.query(`ALTER TABLE \`goal\` ADD \`interval\` varchar(255) NOT NULL DEFAULT 'hour'`);
    for (const item of items) {
      for (const key of Object.keys(interval)) {
        if (item.interval === (interval as any)[key]) {
          item.interval = key;
        }
      }
      const keys = Object.keys(item);
      await queryRunner.query(
        `INSERT INTO \`goal\`(${keys.map(o => `\`${o}\``).join(', ')}) values (${keys.map(o => `?`).join(', ')})`,
        [keys.map(key => item[key])],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`goal\` DROP COLUMN \`interval\``);
    await queryRunner.query(`ALTER TABLE \`goal\` ADD \`interval\` bigint NOT NULL DEFAULT '0'`);
  }

}
