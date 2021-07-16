import { MigrationInterface, QueryRunner } from 'typeorm';

export class removeChangelog1618939162327 implements MigrationInterface {
  name = 'removeChangelog1618939162327';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE \`changelog\``);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    return;
  }

}
