import { MigrationInterface, QueryRunner } from 'typeorm';

export class updateOverlayMappers1645019207859 implements MigrationInterface {
  name = 'updateOverlayMappers1645019207859';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "overlay_mapper" ADD "name" character varying`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    return;
  }

}
