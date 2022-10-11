import { MigrationInterface, QueryRunner } from 'typeorm';
import { insertItemIntoTable } from '~/database/insertItemIntoTable';

export class updatePollTable1665480646971 implements MigrationInterface {
  name = 'updatePollTable1665480646971';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const items = await queryRunner.query(`SELECT * from \`poll\``);
    const items2 = await queryRunner.query(`SELECT * from \`poll_vote\``);

    await queryRunner.query(`DELETE from \`poll\` WHERE 1=1`);
    await queryRunner.query(`DELETE from \`poll_vote\` WHERE 1=1`);

    await queryRunner.query(`DROP TABLE \`poll_vote\``);
    await queryRunner.query(`DROP TABLE \`poll\``);

    await queryRunner.query(`CREATE TABLE \`poll\` (\`id\` varchar(36) NOT NULL, \`type\` varchar(7) NOT NULL, \`title\` varchar(255) NOT NULL, \`openedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`closedAt\` date NULL, \`options\` text NOT NULL, \`votes\` json PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);

    for (const item of items) {
      item.openedAt = new Date(item.openedAt).getTime();
      item.closedAt = item.isOpened ? null : new Date(item.closedAt).getTime();
      item.votes = JSON.stringify(items2.filter((o: any) => o.pollId === item.id));
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
