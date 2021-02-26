import { MigrationInterface, QueryRunner } from 'typeorm';

const exchangeRates = {
  AUD: 14.728, BGN: 13.313, BRL: 5.006, CAD: 16.92, CHF: 24.554, CNY: 3.356, CZK: 1, DKK: 3.484, EUR: 26.04, GBP: 29.23, HKD: 3.019, HRK: 3.445, HUF: 0.077, IDR: 0.002, ILS: 6.37, INR: 0.318, ISK: 0.174, JPY: 0.219, KRW: 0.019, MXN: 1.094, MYR: 5.481, NOK: 2.345, NZD: 14.369, PHP: 0.46, PLN: 5.976, RON: 5.4, RUB: 0.322, SEK: 2.401, SGD: 16.603, THB: 0.739, TRY: 3.728, USD: 23.449, ZAR: 1.454, XDR: 32.316,
};

let tips: any[] = [];

const mainCurrency = (result: any) => {
  return result.length > 0 ? JSON.parse(result[0].value as string) : 'EUR';
};

const exchange = (value: number, from: string, to: string): number => {
  if (from.toLowerCase().trim() === to.toLowerCase().trim()) {
    return Number(value); // nothing to do
  }

  if (to.toLowerCase().trim() !== 'czk') {
    return (value * (exchangeRates as any)[from]) / (exchangeRates as any)[to];
  } else {
    return value * (exchangeRates as any)[from];
  }
};

export class tipsExchangeRates1584106270435 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<any> {
    tips = await queryRunner.query(`SELECT * from "user_tip"`, undefined);
    const tipsWithExchangeRates: any[] = [];

    // 1. prepare all sortAmount values
    const resultMainCurrency = await queryRunner.query(`SELECT "value" from "settings" WHERE "namespace" = '/core/currency' AND "name" = 'mainCurrency'`, undefined);

    for (const tip of tips) {
      tipsWithExchangeRates.push({
        ...tip,
        exchangeRates: exchangeRates,
        sortAmount:    exchange(tip.amount, tip.currency, mainCurrency(resultMainCurrency)),
      });
    }

    // 2. drop user_tip table
    await queryRunner.query(`DROP TABLE "user_tip"`, undefined);

    // 3. create fresh user_tip table
    await queryRunner.query(`CREATE TABLE "user_tip" ("id" SERIAL NOT NULL, "amount" float NOT NULL, "sortAmount" float NOT NULL, "exchangeRates" text NOT NULL, "currency" varchar NOT NULL, "message" text NOT NULL, "tippedAt" bigint NOT NULL DEFAULT (0), "userUserId" integer, CONSTRAINT "PK_0bea18dcc7e730784d58261dffd" PRIMARY KEY ("id"), CONSTRAINT "FK_36683fb221201263b38344a9880" FOREIGN KEY ("userUserId") REFERENCES "user" ("userId") ON DELETE CASCADE ON UPDATE CASCADE)`, undefined);

    // 4. add data with proper exchangeRates
    for (const tip of tipsWithExchangeRates) {
      if (!tip.userUserId) {
        continue;
      }
      await queryRunner.query(
        `INSERT INTO "user_tip" ("amount", "sortAmount", "exchangeRates", "currency", "message", "tippedAt", "userUserId") VALUES ('${tip.amount}', '${tip.sortAmount}', '${JSON.stringify(tip.exchangeRates)}', '${tip.currency}', '${tip.message.replace(/\'/g, '\\\'')}', '${tip.tippedAt}', '${tip.userUserId}')`, undefined);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<any> {
    // 1. drop user_tip table
    await queryRunner.query(`DROP TABLE "user_tip"`, undefined);

    // 2. create fresh user_tip table
    await queryRunner.query(`CREATE TABLE "user_tip" ("id" SERIAL NOT NULL, "amount" float NOT NULL, "sortAmount" float NOT NULL, "currency" varchar NOT NULL, "message" text NOT NULL, "tippedAt" bigint NOT NULL DEFAULT (0), "userUserId" integer, CONSTRAINT "FK_36683fb221201263b38344a9880" FOREIGN KEY ("userUserId") REFERENCES "user" ("userId") ON DELETE CASCADE ON UPDATE CASCADE)`, undefined);

    // 3. add data without exchangeRates
    for (const tip of tips) {
      if (!tip.userUserId) {
        continue;
      }
      await queryRunner.query(
        `INSERT INTO "user_tip" ("amount", "sortAmount", "currency", "message", "tippedAt", "userUserId")VALUES ('${tip.amount}', '${tip.sortAmount}', '${tip.currency}', '${tip.message}', '${tip.tippedAt}', '${tip.userUserId}')`, undefined);
    }
  }
}
