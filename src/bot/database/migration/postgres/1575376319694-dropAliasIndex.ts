import {MigrationInterface, QueryRunner} from 'typeorm';

export class dropAliasIndex1575376319694 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(`DROP INDEX "IDX_ed5fcb69444dcb0abf0a71053b"`, undefined);
  }

  public async down(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(`CREATE INDEX "IDX_ed5fcb69444dcb0abf0a71053b" ON "alias" ("command") `, undefined);
  }

}
