import { MigrationInterface, QueryRunner } from 'typeorm';

export class removeTipsAndBitsRelation1618939162326 implements MigrationInterface {
  name = 'removeTipsAndBitsRelation1618939162326';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const tips: any[] = await queryRunner.query(`SELECT * from "user_tip"`);
    const bits: any[] = await queryRunner.query(`SELECT * from "user_bit"`);

    await queryRunner.query(`DROP TABLE "user_tip"`);
    await queryRunner.query(`DROP TABLE "user_bit"`);
    await queryRunner.query(`CREATE TABLE "user_tip" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "amount" float NOT NULL, "sortAmount" float NOT NULL, "exchangeRates" text NOT NULL, "currency" varchar NOT NULL, "message" text NOT NULL, "tippedAt" bigint NOT NULL DEFAULT (0), "userId" varchar)`);
    await queryRunner.query(`CREATE TABLE "user_bit" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "amount" bigint NOT NULL, "message" text NOT NULL, "cheeredAt" bigint NOT NULL DEFAULT (0), "userId" varchar)`);

    for (const tip of tips as any) {
      tip.userId = tip.userUserId;
      delete tip.userUserId;
      await queryRunner.manager.getRepository(`user_tip`).save(tip);
    }
    for (const bit of bits as any) {
      bit.userId = bit.userUserId;
      delete bit.userUserId;
      await queryRunner.manager.getRepository(`user_bit`).save(bit);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "user_bit" RENAME TO "temporary_user_bit"`);
    await queryRunner.query(`CREATE TABLE "user_bit" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "amount" bigint NOT NULL, "message" text NOT NULL, "cheeredAt" bigint NOT NULL DEFAULT (0), "userUserId" varchar, CONSTRAINT "FK_cca96526faa532e7d20a0f775b0" FOREIGN KEY ("userUserId") REFERENCES "user" ("userId") ON DELETE CASCADE ON UPDATE CASCADE)`);
    await queryRunner.query(`INSERT INTO "user_bit"("id", "amount", "message", "cheeredAt", "userUserId") SELECT "id", "amount", "message", "cheeredAt", "userId" FROM "temporary_user_bit"`);
    await queryRunner.query(`DROP TABLE "temporary_user_bit"`);
    await queryRunner.query(`ALTER TABLE "user_tip" RENAME TO "temporary_user_tip"`);
    await queryRunner.query(`CREATE TABLE "user_tip" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "amount" float NOT NULL, "sortAmount" float NOT NULL, "exchangeRates" text NOT NULL, "currency" varchar NOT NULL, "message" text NOT NULL, "tippedAt" bigint NOT NULL DEFAULT (0), "userUserId" varchar, CONSTRAINT "FK_36683fb221201263b38344a9880" FOREIGN KEY ("userUserId") REFERENCES "user" ("userId") ON DELETE CASCADE ON UPDATE CASCADE)`);
    await queryRunner.query(`INSERT INTO "user_tip"("id", "amount", "sortAmount", "exchangeRates", "currency", "message", "tippedAt", "userUserId") SELECT "id", "amount", "sortAmount", "exchangeRates", "currency", "message", "tippedAt", "userId" FROM "temporary_user_tip"`);
    await queryRunner.query(`DROP TABLE "temporary_user_tip"`);
  }

}
