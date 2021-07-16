import { MigrationInterface, QueryRunner } from 'typeorm';

export class removeTextOverlayRefreshRate1612655255728 implements MigrationInterface {
  name = 'removeTextOverlayRefreshRate1612655255728';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "text" DROP COLUMN "refreshRate"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "text" ADD "refreshRate" integer NOT NULL DEFAULT '5'`);
  }

}
