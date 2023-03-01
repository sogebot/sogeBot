import { MigrationInterface, QueryRunner } from 'typeorm';

export class priceBits1601537943813 implements MigrationInterface {
  name = 'priceBits1601537943813';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE `price` ADD `priceBits` int NOT NULL DEFAULT 0');
    await queryRunner.query('ALTER TABLE `price` ADD `emitRedeemEvent` tinyint NOT NULL DEFAULT 0');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE `price` DROP COLUMN `emitRedeemEvent`');
    await queryRunner.query('ALTER TABLE `price` DROP COLUMN `priceBits`');
  }

}
