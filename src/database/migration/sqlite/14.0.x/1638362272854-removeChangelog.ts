import { MigrationInterface, QueryRunner } from 'typeorm';

export class removeChangelog1638362272854 implements MigrationInterface {
  name = 'removeChangelog1638362272854';

  public async up(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(`DELETE FROM "settings" WHERE "namespace"='/core/updater' AND "name"='changelog'`, undefined);
  }

  public async down(queryRunner: QueryRunner): Promise<any> {
    return;
  }

}
