import { MigrationInterface, QueryRunner } from 'typeorm';

export class renameUsernameAttr1634565308933 implements MigrationInterface {
  name = 'renameUsernameAttr1634565308933';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_78a916df40e02a9deb1c4b75ed"`);
    await queryRunner.query(`ALTER TABLE user RENAME COLUMN username TO userName;`);
    await queryRunner.query(`CREATE INDEX "IDX_78a916df40e02a9deb1c4b75ed" ON "user" ("userName") `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    return;
  }

}