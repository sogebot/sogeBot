import { MigrationInterface, QueryRunner } from 'typeorm';

import { insertItemIntoTable } from '../../../insertItemIntoTable.js';

export class changeKeywordsResponses1678892044040 implements MigrationInterface {
  name = 'changeKeywordsResponses1678892044040';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const items = await queryRunner.query(`SELECT * from \`keyword\``);
    const items2 = await queryRunner.query(`SELECT * from \`keyword_responses\``);

    await queryRunner.query(`DELETE from \`keyword_responses\` WHERE 1=1`);
    await queryRunner.query(`DELETE from \`keyword\` WHERE 1=1`);

    await queryRunner.query(`DROP TABLE \`keyword_responses\``);
    await queryRunner.query(`DROP TABLE \`keyword\``);

    await queryRunner.query(`CREATE TABLE \`keyword\` (\`id\` varchar(36) NOT NULL, \`keyword\` varchar(255) NOT NULL, \`enabled\` tinyint NOT NULL, \`group\` varchar(255) NULL, \`responses\` json NOT NULL, INDEX \`IDX_35e3ff88225eef1d85c951e229\` (\`keyword\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);

    for (const item of items) {
      item.responses = JSON.stringify(items2.filter((o: any) => o.keywordId === item.id));
      await insertItemIntoTable('keyword', {
        ...item,
      }, queryRunner);
    }

    return;
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    return;
  }

}
