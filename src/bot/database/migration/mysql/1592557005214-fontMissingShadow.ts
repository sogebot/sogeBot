import {MigrationInterface, QueryRunner} from 'typeorm';

import { AlertCheer, AlertFollow, AlertHost, AlertRaid, AlertResub, AlertSub, AlertSubcommunitygift, AlertSubgift, AlertTip } from '../../entity/alert';
import { Goal } from '../../entity/goal';
import { Randomizer } from '../../entity/randomizer';

export class fontMissingShadow1592557005214 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    // remove old migration
    await queryRunner.query('DELETE FROM `migrations` WHERE `name`="fontMissingShadow1592557005213"');

    const data = await queryRunner.manager.getRepository(Randomizer).find();
    for (const item of data) {
      if (typeof item.customizationFont.shadow === 'undefined') {
        await queryRunner.manager.getRepository(Randomizer)
          .update({ id: item.id }, { customizationFont: {...item.customizationFont, shadow: []} });
      }
    }

    for (const table of [AlertFollow, AlertSub, AlertSubcommunitygift, AlertSubgift, AlertHost, AlertRaid, AlertTip, AlertCheer, AlertResub]) {
      const data2 = await queryRunner.manager.getRepository(table).find();
      for (const item of data2) {
        if (typeof item.font.shadow === 'undefined') {
          await queryRunner.manager.getRepository(table)
            .update({ id: item.id }, { font: {...item.font, shadow: []} });
        }
      }
    }

    const data3 = await queryRunner.manager.getRepository(Goal).find();
    for (const item of data3) {
      if (typeof item.customizationFont.shadow === 'undefined') {
        await queryRunner.manager.getRepository(Randomizer)
          .update({ id: item.id }, { customizationFont: {...item.customizationFont, shadow: []} });
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

    for (const table of [AlertFollow, AlertSub, AlertSubcommunitygift, AlertSubgift, AlertHost, AlertRaid, AlertTip, AlertCheer, AlertResub]) {
      const data2 = await queryRunner.manager.getRepository(table).find();
      for (const item of data2) {
        if (typeof item.font.shadow !== 'undefined') {
          const { shadow, ...font } = item.font;
          await queryRunner.manager.getRepository(table)
            .update({ id: item.id }, { font });
        }
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
