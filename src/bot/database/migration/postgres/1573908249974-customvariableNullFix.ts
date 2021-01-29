import { MigrationInterface, QueryRunner } from 'typeorm';

export class customvariableNullFix1573908249974 implements MigrationInterface {
  name = 'customvariableNullFix1573908249974';

  public async up(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(`ALTER TABLE "variable" ALTER COLUMN "currentValue" DROP NOT NULL`, undefined);
  }

  public async down(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(`ALTER TABLE "variable" ALTER COLUMN "currentValue" SET NOT NULL`, undefined);
  }

}
