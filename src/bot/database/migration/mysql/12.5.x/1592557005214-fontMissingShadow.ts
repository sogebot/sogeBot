import { MigrationInterface, QueryRunner } from 'typeorm';

import { Goal } from '../../../entity/goal';
import { Randomizer } from '../../../entity/randomizer';

export class fontMissingShadow1592557005214 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    // remove old migration
    await queryRunner.query('DELETE FROM `migrations` WHERE `name`="fontMissingShadow1592557005213"');

    const data = await queryRunner.manager.getRepository(Randomizer).find();
    for (const item of data) {
      if (typeof item.customizationFont.shadow === 'undefined') {
        await queryRunner.manager.getRepository(Randomizer)
          .update({ id: item.id }, { customizationFont: { ...item.customizationFont, shadow: [] } });
      }
    }
    for (const type of ['cheer', 'resub', 'tip', 'raid', 'host', 'subgift', 'subcommunitygift', 'sub', 'follow']) {
      const alerts = await queryRunner.query(`SELECT * from \`alert_${type}\``, undefined);
      for (const alert of alerts) {
        const font:any = JSON.parse(alert.font);
        if (typeof font.shadow === 'undefined') {
          font.shadow = [];
        }
        await queryRunner.query(`UPDATE \`alert_${type}\` SET font='${JSON.stringify(font)}' WHERE id='${alert.id}'`);
      }
    }

    const data3 = await queryRunner.manager.getRepository(Goal).find();
    for (const item of data3) {
      if (typeof item.customizationFont.shadow === 'undefined') {
        await queryRunner.manager.getRepository(Randomizer)
          .update({ id: item.id }, { customizationFont: { ...item.customizationFont, shadow: [] } });
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const data = await queryRunner.manager
      .getRepository(Randomizer)
      .createQueryBuilder('user')
      .getMany();
    for (const item of data) {
      if (typeof item.customizationFont.shadow !== 'undefined') {
        const { shadow, ...customizationFont } = item.customizationFont;
        await queryRunner.manager
          .getRepository(Randomizer)
          .update({ id: item.id }, { customizationFont });
      }
    }

    for (const type of ['cheer', 'resub', 'tip', 'raid', 'host', 'subgift', 'subcommunitygift', 'sub', 'follow']) {
      const alerts = await queryRunner.query(`SELECT * from \`alert_${type}\``, undefined);
      for (const alert of alerts) {
        const { shadow, ...font }:any = JSON.parse(alert.font);
        await queryRunner.query(`UPDATE \`alert_${type}\` SET font='${JSON.stringify(font)}' WHERE id='${alert.id}'`);
      }
    }

    const data3 = await queryRunner.manager.getRepository(Goal).find();
    for (const item of data3) {
      if (typeof item.customizationFont.shadow !== 'undefined') {
        const { shadow, ...customizationFont } = item.customizationFont;
        await queryRunner.manager.getRepository(Goal)
          .update({ id: item.id }, { customizationFont });
      }
    }
  }

}
