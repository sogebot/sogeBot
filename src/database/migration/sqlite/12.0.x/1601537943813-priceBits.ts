import { MigrationInterface, QueryRunner } from 'typeorm';

export class priceBits1601537943813 implements MigrationInterface {
  name = 'priceBits1601537943813';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_d12db23d28020784096bcb41a3"`);
    await queryRunner.query(`CREATE TABLE "temporary_price" ("id" varchar PRIMARY KEY NOT NULL, "command" varchar NOT NULL, "enabled" boolean NOT NULL DEFAULT (1), "price" integer NOT NULL, "emitRedeemEvent" boolean NOT NULL DEFAULT (0), "priceBits" integer NOT NULL DEFAULT (0))`);
    await queryRunner.query(`INSERT INTO "temporary_price"("id", "command", "enabled", "price") SELECT "id", "command", "enabled", "price" FROM "price"`);
    await queryRunner.query(`DROP TABLE "price"`);
    await queryRunner.query(`ALTER TABLE "temporary_price" RENAME TO "price"`);
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_d12db23d28020784096bcb41a3" ON "price" ("command") `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_d12db23d28020784096bcb41a3"`);
    await queryRunner.query(`ALTER TABLE "price" RENAME TO "temporary_price"`);
    await queryRunner.query(`CREATE TABLE "price" ("id" varchar PRIMARY KEY NOT NULL, "command" varchar NOT NULL, "enabled" boolean NOT NULL DEFAULT (1), "price" integer NOT NULL)`);
    await queryRunner.query(`INSERT INTO "price"("id", "command", "enabled", "price") SELECT "id", "command", "enabled", "price" FROM "temporary_price"`);
    await queryRunner.query(`DROP TABLE "temporary_price"`);
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_d12db23d28020784096bcb41a3" ON "price" ("command") `);
  }

}
