import { MigrationInterface, QueryRunner } from 'typeorm';

export class overlayMapper1604326861945 implements MigrationInterface {
  name = 'overlayMapper1604326861945';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "overlay_mapper" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "value" character varying, CONSTRAINT "PK_5e8226e8515950fea90f012db7c" PRIMARY KEY ("id"))`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "overlay_mapper"`);
  }

}
