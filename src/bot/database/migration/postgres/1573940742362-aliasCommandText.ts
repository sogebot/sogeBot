import { MigrationInterface, QueryRunner } from 'typeorm';

export class aliasCommandText1573940742362 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(`DROP INDEX "IDX_ed5fcb69444dcb0abf0a71053b"`, undefined);
    await queryRunner.query('ALTER TABLE "alias" ALTER COLUMN "command" SET DATA TYPE text', undefined);
  }

  public async down(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(`ALTER TABLE "alias" ALTER COLUMN "command" SET DATA TYPE character varying`, undefined);
    await queryRunner.query(`CREATE INDEX "IDX_ed5fcb69444dcb0abf0a71053b" ON "alias" ("command") `, undefined);
  }

}
