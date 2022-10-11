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

    await queryRunner.query(`CREATE TABLE \`poll\` (\`id\` varchar(36) NOT NULL, \`type\` varchar(7) NOT NULL, \`title\` varchar(255) NOT NULL, \`openedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`closedAt\` date NULL, \`options\` text NOT NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
    await queryRunner.query(`CREATE TABLE \`poll_vote\` (\`id\` varchar(36) NOT NULL, \`option\` int NOT NULL, \`votes\` int NOT NULL, \`votedBy\` varchar(255) NOT NULL, \`pollId\` varchar(255) NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
    await queryRunner.query(`ALTER TABLE \`poll_vote\` ADD CONSTRAINT \`FK_99f9db6d3dae2a0aebebbf8e10a\` FOREIGN KEY (\`pollId\`) REFERENCES \`poll\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE`);

    for (const item of items) {
      item.openedAt = new Date(item.openedAt).getTime();
      item.closedAt = item.isOpened ? null : new Date(item.closedAt).getTime();
      delete item.isOpened;
      await insertItemIntoTable('poll', {
        ...item,
      }, queryRunner);
    }

    for (const item of items2) {
      await insertItemIntoTable('poll_vote', {
        ...item,
      }, queryRunner);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    return;
  }

}
