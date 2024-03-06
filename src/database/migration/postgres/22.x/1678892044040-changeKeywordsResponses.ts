import { MigrationInterface, QueryRunner } from 'typeorm';

export class changeKeywordsResponses1678892044040 implements MigrationInterface {
  name = 'changeKeywordsResponses1678892044040';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // const items = await queryRunner.query(`SELECT * from "keywords"`);
    // const items2 = await queryRunner.query(`SELECT * from "keywords_responses"`);

    await queryRunner.query(`DELETE from "keywords_responses" WHERE 1=1`);
    await queryRunner.query(`DELETE from "keywords" WHERE 1=1`);

    await queryRunner.query(`DROP TABLE "keywords_responses"`);
    await queryRunner.query(`DROP TABLE "keywords"`);

    return;
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    return;
  }

}
