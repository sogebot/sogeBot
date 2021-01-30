import { MigrationInterface, QueryRunner } from 'typeorm';

export class textOverlayRefreshRate1607215601801 implements MigrationInterface {
  name = 'textOverlayRefreshRate1607215601801';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "text" ADD "refreshRate" integer NOT NULL DEFAULT '5'`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "text" DROP COLUMN "refreshRate"`);
  }

}
