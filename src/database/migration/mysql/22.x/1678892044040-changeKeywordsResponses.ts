import { MigrationInterface, QueryRunner } from 'typeorm';

export class changeKeywordsResponses1678892044040 implements MigrationInterface {
  name = 'changeKeywordsResponses1678892044040';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // const items = await queryRunner.query(`SELECT * from \`keyword\``);
    // const items2 = await queryRunner.query(`SELECT * from \`keyword_responses\``);

    await queryRunner.query(`DELETE from \`keyword_responses\` WHERE 1=1`);
    await queryRunner.query(`DELETE from \`keyword\` WHERE 1=1`);

    await queryRunner.query(`DROP TABLE \`keyword_responses\``);
    await queryRunner.query(`DROP TABLE \`keyword\``);

    return;
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    return;
  }

}
