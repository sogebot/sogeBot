import { MigrationInterface, QueryRunner } from 'typeorm';

import { insertItemIntoTable } from '~/database/insertItemIntoTable';

export class quoteCreatedAtChange1662119547477 implements MigrationInterface {
  name = 'quoteCreatedAtChange1662119547477';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const items = await queryRunner.query(`SELECT * from \`quotes\``);
    await queryRunner.query(`DELETE from \`quotes\` WHERE 1=1`);

    await queryRunner.query(`ALTER TABLE \`quotes\` DROP COLUMN \`createdAt\``);
    await queryRunner.query(`ALTER TABLE \`quotes\` ADD \`createdAt\` varchar(30) NOT NULL DEFAULT '1970-01-01T00:00:00.000Z'`);

    for (const item of items) {
      await insertItemIntoTable('quotes', {
        ...item,
        createdAt: new Date(item.createdAt).toISOString(),
      }, queryRunner);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    return;
  }

}