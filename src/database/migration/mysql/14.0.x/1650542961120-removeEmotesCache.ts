import { MigrationInterface, QueryRunner } from 'typeorm';

export class removeEmotesCache1650542961120 implements MigrationInterface {
  name = 'removeEmotesCache1650542961120';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE \`cache_emotes\``);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    return;
  }

}
