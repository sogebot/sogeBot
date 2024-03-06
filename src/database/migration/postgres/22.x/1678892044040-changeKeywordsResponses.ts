import { MigrationInterface, QueryRunner } from 'typeorm';

export class changeKeywordsResponses1678892044040 implements MigrationInterface {
  name = 'changeKeywordsResponses1678892044040';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // const items = await queryRunner.query(`SELECT * from "commands"`);
    // const items2 = await queryRunner.query(`SELECT * from "commands_responses"`);

    await queryRunner.query(`DELETE from "commands_responses" WHERE 1=1`);
    await queryRunner.query(`DELETE from "commands" WHERE 1=1`);

    await queryRunner.query(`DROP TABLE "commands_responses"`);
    await queryRunner.query(`DROP TABLE "commands"`);

    return;
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    return;
  }

}
