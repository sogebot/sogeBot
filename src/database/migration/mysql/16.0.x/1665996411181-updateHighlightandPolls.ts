import { MigrationInterface, QueryRunner } from 'typeorm';
import { insertItemIntoTable } from '~/database/insertItemIntoTable';

export class updateHighlightAndPolls1665996411181 implements MigrationInterface {
  name = 'updateHighlightAndPolls1665996411181';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const items = await queryRunner.query(`SELECT * from \`highlight\``);
    const items2 = await queryRunner.query(`SELECT * from \`poll\``);
    const items3 = await queryRunner.query(`SELECT * from \`poll_vote\``);

    await queryRunner.query(`DELETE from \`poll\` WHERE 1=1`);
    await queryRunner.query(`DELETE from \`poll\` WHERE 1=1`);
    await queryRunner.query(`DELETE from \`poll_vote\` WHERE 1=1`);

    await queryRunner.query(`DROP TABLE \`poll_vote\``);
    await queryRunner.query(`DROP TABLE \`poll\``);
    await queryRunner.query('CREATE TABLE `poll` (`votes` json NOT NULL, `id` varchar(36) NOT NULL, `type` varchar(7) NOT NULL, `title` varchar(255) NOT NULL, `openedAt` bigint NOT NULL DEFAULT 0, `closedAt` bigint NOT NULL DEFAULT 0, `options` text NOT NULL, PRIMARY KEY (`id`)) ENGINE=InnoDB', undefined);

    await queryRunner.query(`ALTER TABLE \`highlight\` DROP COLUMN \`timestamp\``);
    await queryRunner.query(`ALTER TABLE \`highlight\` ADD \`timestamp\` json NOT NULL`);
    await queryRunner.query(`ALTER TABLE \`highlight\` DROP COLUMN \`createdAt\``);
    await queryRunner.query(`ALTER TABLE \`highlight\` ADD \`createdAt\` varchar(30) NOT NULL`);
    await queryRunner.query(`ALTER TABLE \`poll\` DROP COLUMN \`openedAt\``);
    await queryRunner.query(`ALTER TABLE \`poll\` ADD \`openedAt\` varchar(30) NOT NULL`);
    await queryRunner.query(`ALTER TABLE \`poll\` DROP COLUMN \`closedAt\``);
    await queryRunner.query(`ALTER TABLE \`poll\` ADD \`closedAt\` varchar(30) NULL`);

    for (const item of items) {
      item.createdAt = new Date(item.createdAt).toISOString();
      await insertItemIntoTable('highlight', {
        ...item,
      }, queryRunner);
    }

    for (const item of items2) {
      item.openedAt = new Date(item.openedAt).toISOString();
      item.closedAt = item.isOpened ? null : new Date(item.closedAt).toISOString();
      item.votes = JSON.stringify(items3.filter((o: any) => o.pollId === item.id));
      delete item.isOpened;
      await insertItemIntoTable('poll', {
        ...item,
      }, queryRunner);
    }

  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    return;
  }

}
