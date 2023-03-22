import { MigrationInterface, QueryRunner } from 'typeorm';

export class removePoll1678892044030 implements MigrationInterface {
  name = 'removePoll1678892044030';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE \`poll\``);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    return;
  }

}
