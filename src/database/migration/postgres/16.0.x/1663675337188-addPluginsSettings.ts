import { MigrationInterface, QueryRunner } from 'typeorm';

export class addPluginsSetrtings1663675337188 implements MigrationInterface {
  name = 'addPluginsSetrtings1663675337188';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "plugin" ADD "settings" text`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    return;
  }

}
