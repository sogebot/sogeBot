import {MigrationInterface, QueryRunner} from 'typeorm';
import { Randomizer } from '../../entity/randomizer';
import { AlertCheer, AlertFollow, AlertHost, AlertRaid, AlertResub, AlertSub, AlertSubcommunitygift, AlertSubgift, AlertTip } from '../../entity/alert';

export class fontMissingShadow1592557005213 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
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
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const data = await queryRunner.manager
      .getRepository(Randomizer)
      .createQueryBuilder('user')
      .getMany();
    for (const item of data) {
      if (typeof item.customizationFont.shadow !== 'undefined') {
        delete item.customizationFont.shadow;
        await queryRunner.manager
          .getRepository(Randomizer)
          .update({ id: item.id }, { customizationFont: item.customizationFont });
      }
    }

    for (const table of [AlertFollow, AlertSub, AlertSubcommunitygift, AlertSubgift, AlertHost, AlertRaid, AlertTip, AlertCheer, AlertResub]) {
      const data2 = await queryRunner.manager.getRepository(table).find();
      for (const item of data2) {
        if (typeof item.font.shadow !== 'undefined') {
          delete item.font.shadow;
          await queryRunner.manager.getRepository(table)
            .update({ id: item.id }, { font: item.font });
        }
      }
    }
  }

}
