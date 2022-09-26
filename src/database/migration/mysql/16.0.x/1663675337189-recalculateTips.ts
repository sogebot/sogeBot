import { MigrationInterface, QueryRunner } from 'typeorm';

import exchange from '~/helpers/currency/exchange';
import rates from '~/helpers/currency/rates';

export class recalculateTips1663675337189 implements MigrationInterface {
  name = 'recalculateTips1663675337189';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const mainCurrency = JSON.parse((await queryRunner.query(`SELECT * from \`settings\``)).find((o: any) => {
      return o.namespace === '/core/currency' && o.name === 'mainCurrency';
    })?.value ?? '"EUR"') as any;
    await queryRunner.query(`UPDATE \`user_tip\` SET \`exchangeRates\`='${JSON.stringify(rates)}'`);
    const items = await queryRunner.query(`SELECT * from \`user_tip\``);
    for (const it of items) {
      await queryRunner.query(`UPDATE \`user_tip\` SET \`sortAmount\`='${exchange(it.amount, it.currency, mainCurrency)}' WHERE \`id\`=${it.id}`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    return;
  }

}
